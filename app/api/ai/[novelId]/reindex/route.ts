/**
 * RAG reindex: embeds lore entries via Voyage and manuscript chunks via OpenRouter.
 */
import { cookies } from "next/headers";
import { isValidAuthCookie } from "@/lib/auth";
import { assertSafeNovelId } from "@/lib/ids";
import { getLoreIndex, getLoreEntry, updateLoreIndex } from "@/lib/lore";
import { embedBatch } from "@/lib/ai/embeddings";
import { getFile } from "@/lib/github-content";
import {
  getManuscriptRagIndex,
  updateManuscriptRagIndex,
} from "@/lib/manuscript-rag";
import type { ManuscriptRagRecord } from "@/types/manuscript-rag";
import { reindexSingleChapter } from "@/lib/ai/manuscript-reindex";
import { todayISO } from "@/lib/utils";
import { parseNovelMeta } from "@/lib/novel-meta";

const MS_LOG = "[reindex:manuscript]";
const msLog = {
  info:  console.log.bind(console,   MS_LOG),
  warn:  console.warn.bind(console,  MS_LOG),
  error: console.error.bind(console, MS_LOG),
};

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

  const today = todayISO();

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
      snippet:   entries[i]?.body.slice(0, 300) ?? "",
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
    msLog.warn("skipping — OPENROUTER_API_KEY not set", { novelId });
  } else {
    msLog.info("start", { novelId, openrouterKeySet: true });
    try {
      const { content: metaContent } = await getFile(`content/${novelId}/meta.json`);
      const meta = parseNovelMeta(metaContent);

      const slugs  = meta.chapterOrder ?? [];
      const titles = meta.chapterTitles ?? {};

      msLog.info("meta loaded", {
        chapterCount: slugs.length,
        firstSlugs:     slugs.slice(0, 5),
      });
      if (slugs.length === 0) {
        msLog.warn("meta.chapterOrder is empty — no manuscript chapters to embed", { novelId });
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

      // Process in batches of 3 to stay safely within the 20 req/min free-tier
      // rate limit while reducing total wall-clock time vs. strict serial.
      const BATCH_SIZE = 3;
      for (let i = 0; i < slugs.length; i += BATCH_SIZE) {
        const batch = slugs.slice(i, i + BATCH_SIZE);
        const results = await Promise.all(
          batch.map((slug) => reindexSingleChapter(novelId, slug, titles[slug] ?? slug)),
        );
        for (let j = 0; j < batch.length; j++) {
          const slug   = batch[j]!;
          const result = results[j]!;
          if (!result.ok) {
            chapterErrors[slug] = result.error;
            newEntries.push(...(existingBySlug.get(slug) ?? []));
          } else {
            newEntries.push(...result.entries);
            manuscriptChunks += result.chunks;
          }
        }
      }

      // Only write the index if we processed any chapters at all
      if (slugs.length > 0) {
        await updateManuscriptRagIndex(novelId, { entries: newEntries });
      }

      if (Object.keys(chapterErrors).length > 0) {
        manuscriptError = JSON.stringify(chapterErrors);
        msLog.error("finished with chapter errors", {
          novelId,
          errorSlugs: Object.keys(chapterErrors),
          chapterErrors,
        });
      } else {
        msLog.info("finished OK", { novelId, manuscriptChunks, indexEntryCount: newEntries.length });
      }
    } catch (e) {
      manuscriptError = String(e);
      msLog.error("fatal manuscript reindex error", {
        novelId,
        message: e instanceof Error ? e.message : String(e),
        stack:   e instanceof Error ? e.stack : undefined,
      });
    }
  }

  return Response.json({ reindexed, manuscriptChunks, ...(manuscriptError ? { manuscriptError } : {}) });
}
