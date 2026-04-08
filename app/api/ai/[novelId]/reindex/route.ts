/**
 * RAG reindex: embeds lore entries via Voyage and manuscript chunks via OpenRouter.
 */
import { cookies } from "next/headers";
import { isValidAuthCookie } from "@/lib/auth";
import { assertSafeNovelId } from "@/lib/ids";
import { getLoreIndex, getLoreEntry, updateLoreIndex } from "@/lib/lore";
import { embedBatch } from "@/lib/ai/embeddings";
import { embedBatchMs } from "@/lib/ai/embeddings-openrouter";
import { getFile } from "@/lib/github-content";
import {
  chunkManuscriptMarkdown,
  manuscriptChunkEmbedText,
  getManuscriptRagIndex,
  updateManuscriptRagIndex,
  saveManuscriptEmbShard,
} from "@/lib/manuscript-rag";
import type { ManuscriptRagRecord } from "@/types/manuscript-rag";
import { MANUSCRIPT_EMB_DIMS } from "@/lib/ai/embeddings-openrouter";

const MS_LOG = "[reindex:manuscript]";

function logMs(...args: unknown[]) {
  console.log(MS_LOG, ...args);
}

function warnMs(...args: unknown[]) {
  console.warn(MS_LOG, ...args);
}

function errMs(...args: unknown[]) {
  console.error(MS_LOG, ...args);
}

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ novelId: string }> },
) {
  const jar = await cookies();
  if (!isValidAuthCookie(jar.get("auth_token")?.value)) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { novelId } = await params;
  try { assertSafeNovelId(novelId); }
  catch { return new Response("Invalid novel id", { status: 400 }); }

  const today = new Date().toISOString().slice(0, 10);

  // — Lore reindex (Voyage) —
  let reindexed = 0;
  const loreIndex = await getLoreIndex(novelId);
  if (loreIndex.entries.length > 0) {
    const entries = await Promise.all(
      loreIndex.entries.map((rec) => getLoreEntry(novelId, rec.id)),
    );

    const texts      = entries.map((e) => `${e.type} ${e.name}: ${e.body.slice(0, 500)}`);
    const embeddings = await embedBatch(texts);

    loreIndex.entries = loreIndex.entries.map((rec, i) => ({
      ...rec,
      embedding: embeddings[i] ?? [],
      updatedAt: today,
    }));

    await updateLoreIndex(novelId, loreIndex);
    reindexed = entries.length;
  }

  // — Manuscript reindex (OpenRouter Nemotron free) —
  let manuscriptChunks = 0;
  let manuscriptError: string | undefined;

  if (!process.env.OPENROUTER_API_KEY) {
    manuscriptError = "OPENROUTER_API_KEY is not configured — skipping manuscript embedding";
    warnMs("skipping — OPENROUTER_API_KEY not set", { novelId });
  } else {
    logMs("start", {
      novelId,
      openrouterKeySet: true,
      expectedVectorDims: MANUSCRIPT_EMB_DIMS,
    });
    try {
      const { content: metaContent } = await getFile(`content/${novelId}/meta.json`);
      const meta = JSON.parse(metaContent) as {
        chapterOrder?: string[];
        chapterTitles?: Record<string, string>;
      };

      const slugs  = meta.chapterOrder ?? [];
      const titles = meta.chapterTitles ?? {};

      logMs("meta loaded", {
        chapterCount: slugs.length,
        firstSlugs:     slugs.slice(0, 5),
      });
      if (slugs.length === 0) {
        warnMs("meta.chapterOrder is empty — no manuscript chapters to embed", { novelId });
      }

      // Load the existing index so we can preserve entries for chapters that fail.
      const existingIndex = await getManuscriptRagIndex(novelId);
      const existingBySlug = new Map<string, ManuscriptRagRecord[]>();
      for (const entry of existingIndex.entries) {
        const arr = existingBySlug.get(entry.chapterSlug) ?? [];
        arr.push(entry);
        existingBySlug.set(entry.chapterSlug, arr);
      }

      const newEntries: ManuscriptRagRecord[] = [];
      const chapterErrors: Record<string, string> = {};

      // Process one chapter at a time to stay within rate limits (20 req/min).
      for (const slug of slugs) {
        const title = titles[slug] ?? slug;

        let chapterContent: string;
        try {
          const { content } = await getFile(`content/${novelId}/manuscript/${slug}.md`);
          chapterContent = content;
        } catch (e) {
          const msg = `fetch failed: ${String(e)}`;
          chapterErrors[slug] = msg;
          errMs("chapter file error", { slug, title, error: msg, cause: e instanceof Error ? e.stack : undefined });
          // Preserve previously embedded entries for this chapter
          newEntries.push(...(existingBySlug.get(slug) ?? []));
          continue;
        }

        const chunks = chunkManuscriptMarkdown(chapterContent);
        if (chunks.length === 0) {
          warnMs("chapter has no chunks after split (empty or whitespace only?)", {
            slug,
            title,
            rawChars: chapterContent.length,
          });
          continue;
        }

        const embedTexts = chunks.map((chunk, idx) =>
          manuscriptChunkEmbedText(title, slug, chunk, `part ${idx + 1} of ${chunks.length}`),
        );

        const totalEmbedChars = embedTexts.reduce((n, t) => n + t.length, 0);
        const maxInputLen = Math.max(...embedTexts.map((t) => t.length));
        logMs("embedding chapter", {
          slug,
          title,
          chunkCount: embedTexts.length,
          totalEmbedChars,
          maxInputLen,
        });

        let embeddings: number[][];
        try {
          embeddings = await embedBatchMs(embedTexts, "search_document");
        } catch (e) {
          const msg = `embed failed: ${String(e)}`;
          chapterErrors[slug] = msg;
          errMs("OpenRouter embed batch failed", {
            slug,
            title,
            chunkCount: embedTexts.length,
            totalEmbedChars,
            maxInputLen,
            message:    e instanceof Error ? e.message : String(e),
            stack:      e instanceof Error ? e.stack : undefined,
          });
          // Preserve previously embedded entries for this chapter
          newEntries.push(...(existingBySlug.get(slug) ?? []));
          continue;
        }

        const lens = embeddings.map((v) => v.length);
        const badDims = lens.filter((l) => l !== MANUSCRIPT_EMB_DIMS && l > 0);
        if (badDims.length > 0 || lens.some((l) => l === 0)) {
          warnMs("unexpected embedding dimensions", {
            slug,
            expected: MANUSCRIPT_EMB_DIMS,
            lengthsSample: lens.slice(0, 8),
            zeroCount: lens.filter((l) => l === 0).length,
          });
        } else {
          logMs("chapter embedded OK", {
            slug,
            vectors: embeddings.length,
            dims:    embeddings[0]?.length ?? 0,
          });
        }

        // Save per-chapter embedding shard
        try {
          await saveManuscriptEmbShard(
            novelId,
            slug,
            chunks.map((_, idx) => ({
              chunkIndex: idx,
              embedding: embeddings[idx] ?? [],
            })),
          );
        } catch (e) {
          const msg = `shard save failed: ${String(e)}`;
          chapterErrors[slug] = msg;
          errMs("saveManuscriptEmbShard failed", {
            slug,
            message: e instanceof Error ? e.message : String(e),
            stack:   e instanceof Error ? e.stack : undefined,
          });
          newEntries.push(...(existingBySlug.get(slug) ?? []));
          continue;
        }

        // Metadata entries (no embeddings — those live in shards)
        for (let idx = 0; idx < chunks.length; idx++) {
          newEntries.push({
            chapterSlug:  slug,
            chunkIndex:   idx,
            chapterTitle: title,
            embedding:    [],
            text:         chunks[idx],
            updatedAt:    today,
          });
        }

        manuscriptChunks += chunks.length;
      }

      // Only write the index if we processed any chapters at all
      if (slugs.length > 0) {
        await updateManuscriptRagIndex(novelId, { entries: newEntries });
      }

      if (Object.keys(chapterErrors).length > 0) {
        manuscriptError = JSON.stringify(chapterErrors);
        errMs("finished with chapter errors", {
          novelId,
          errorSlugs: Object.keys(chapterErrors),
          chapterErrors,
        });
      } else {
        logMs("finished OK", { novelId, manuscriptChunks, indexEntryCount: newEntries.length });
      }
    } catch (e) {
      manuscriptError = String(e);
      errMs("fatal manuscript reindex error", {
        novelId,
        message: e instanceof Error ? e.message : String(e),
        stack:   e instanceof Error ? e.stack : undefined,
      });
    }
  }

  return Response.json({ reindexed, manuscriptChunks, ...(manuscriptError ? { manuscriptError } : {}) });
}
