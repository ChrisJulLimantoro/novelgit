/**
 * RAG reindex route.
 *
 * ?mode=full    (default) — lore embed + chapter distill + manuscript embed + global bible rebuild
 * ?mode=distill           — chapter distill only (no embed) + global bible rebuild
 * ?mode=bible             — global bible rebuild only from existing index summaries (cheapest)
 */
import { cookies } from "next/headers";
import { isValidAuthCookie } from "@/lib/auth";
import { assertSafeNovelId } from "@/lib/ids";
import { getLoreIndex, getLoreEntry, updateLoreIndex } from "@/lib/lore";
import { embedBatch } from "@/lib/ai/embeddings";
import { embedLoreBatch } from "@/lib/ai/embeddings-gemini";
import { getAiConfig } from "@/lib/ai/ai-config";
import { getFile } from "@/lib/github-content";
import {
  getManuscriptRagIndex,
  updateManuscriptRagIndex,
  updateGlobalBible,
} from "@/lib/manuscript-rag";
import type { ManuscriptRagRecord } from "@/types/manuscript-rag";
import { reindexSingleChapter, distillOnlyChapter } from "@/lib/ai/manuscript-reindex";
import { generateGlobalBible } from "@/lib/ai/global-bible";
import { todayISO } from "@/lib/utils";
import { parseNovelMeta } from "@/lib/novel-meta";

const MS_LOG = "[reindex:manuscript]";
const msLog = {
  info:  console.log.bind(console,   MS_LOG),
  warn:  console.warn.bind(console,  MS_LOG),
  error: console.error.bind(console, MS_LOG),
};

const BATCH_SIZE           = 3;
const GEMINI_TEXT_BATCH_MS = 12_000; // 15 RPM × batch-3
const NEMOTRON_BATCH_MS    =  9_000; // 20 RPM × batch-3
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

// ---------------------------------------------------------------------------
// Shared helper: build global bible from any entry list
// ---------------------------------------------------------------------------
async function rebuildGlobalBible(
  novelId: string,
  entries: ManuscriptRagRecord[],
): Promise<boolean> {
  const seen = new Set<string>();
  const chapterSummaries = entries
    .filter((e) => {
      if (seen.has(e.chapterSlug)) return false;
      seen.add(e.chapterSlug);
      return !!e.chapterSummary;
    })
    .map((e) => ({
      chapterTitle: e.chapterTitle,
      summary:      e.chapterSummary,
      tags:         e.chapterTags,
    }));

  if (chapterSummaries.length === 0) {
    msLog.warn("global bible skipped — no chapter summaries found", { novelId });
    return false;
  }

  const bible = await generateGlobalBible(chapterSummaries);
  if (!bible) return false;
  await updateGlobalBible(novelId, bible);
  msLog.info("global bible rebuilt", { novelId, chaptersUsed: chapterSummaries.length });
  return true;
}

// ---------------------------------------------------------------------------
// Route
// ---------------------------------------------------------------------------
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

  const url  = new URL(_req.url);
  const mode = url.searchParams.get("mode") ?? "full";

  if (mode !== "full" && mode !== "distill" && mode !== "bible") {
    return new Response(`Invalid mode "${mode}". Use full | distill | bible.`, { status: 400 });
  }

  const today    = todayISO();
  const aiConfig = await getAiConfig();

  // ── mode=bible ─────────────────────────────────────────────────────────────
  // Cheapest: just rebuild global bible from summaries already in the index.
  if (mode === "bible") {
    if (!process.env.GEMINI_API_KEY) {
      return Response.json({ error: "GEMINI_API_KEY not set — bible rebuild requires Gemini" }, { status: 400 });
    }
    const existingIndex = await getManuscriptRagIndex(novelId);
    const generated = await rebuildGlobalBible(novelId, existingIndex.entries);
    if (!generated) {
      return Response.json({
        globalBibleGenerated: false,
        error: "No chapter summaries in index — run a full reindex or distill first",
      });
    }
    return Response.json({ globalBibleGenerated: true });
  }

  // ── mode=distill ───────────────────────────────────────────────────────────
  // Medium: re-distill all chapters, update index, rebuild bible. No re-embed.
  if (mode === "distill") {
    if (!process.env.GEMINI_API_KEY) {
      return Response.json({ error: "GEMINI_API_KEY not set — distillation requires Gemini" }, { status: 400 });
    }

    const existingIndex = await getManuscriptRagIndex(novelId);

    // Collect unique chapters in order
    const chapters: { slug: string; title: string }[] = [];
    const seenChapters = new Set<string>();
    for (const e of existingIndex.entries) {
      if (!seenChapters.has(e.chapterSlug)) {
        seenChapters.add(e.chapterSlug);
        chapters.push({ slug: e.chapterSlug, title: e.chapterTitle });
      }
    }

    if (chapters.length === 0) {
      return Response.json({ distilled: 0, globalBibleGenerated: false, error: "No chapters in index — run a full reindex first" });
    }

    msLog.info("distill-only start", { novelId, chapters: chapters.length });

    const summaryMap = new Map<string, { summary: string; tags: string }>();
    const distillErrors: Record<string, string> = {};

    for (let i = 0; i < chapters.length; i += BATCH_SIZE) {
      const batchStart = Date.now();
      const batch = chapters.slice(i, i + BATCH_SIZE);
      const results = await Promise.all(
        batch.map(({ slug, title }) => distillOnlyChapter(novelId, slug, title)),
      );
      for (let j = 0; j < batch.length; j++) {
        const { slug } = batch[j]!;
        const result   = results[j]!;
        if (result.ok) {
          summaryMap.set(slug, { summary: result.summary, tags: result.tags });
        } else {
          distillErrors[slug] = result.error;
        }
      }

      const isLast = i + BATCH_SIZE >= chapters.length;
      if (!isLast) {
        const cooldown = Math.max(0, GEMINI_TEXT_BATCH_MS - (Date.now() - batchStart));
        if (cooldown > 0) {
          msLog.info("rate-limit cooldown", { cooldownMs: cooldown, nextBatch: i + BATCH_SIZE });
          await sleep(cooldown);
        }
      }
    }

    // Patch existing index entries with new summaries (keep everything else)
    const updatedEntries = existingIndex.entries.map((e) => {
      const dist = summaryMap.get(e.chapterSlug);
      if (!dist) return e;
      return { ...e, chapterSummary: dist.summary, chapterTags: dist.tags, updatedAt: today };
    });
    await updateManuscriptRagIndex(novelId, { entries: updatedEntries });

    // Rebuild global bible from fresh summaries
    const globalBibleGenerated = await rebuildGlobalBible(novelId, updatedEntries);

    msLog.info("distill-only done", { novelId, distilled: summaryMap.size, globalBibleGenerated });
    return Response.json({
      distilled: summaryMap.size,
      globalBibleGenerated,
      ...(Object.keys(distillErrors).length > 0 ? { distillErrors } : {}),
    });
  }

  // ── mode=full ──────────────────────────────────────────────────────────────
  // Full reindex: lore embed + chapter distill + manuscript embed + global bible.

  const useGeminiEmb = aiConfig.embeddingProvider === "gemini";

  // — Lore reindex —
  let reindexed = 0;
  const loreIndex = await getLoreIndex(novelId);
  if (loreIndex.entries.length > 0) {
    const entries = await Promise.all(
      loreIndex.entries.map((rec) => getLoreEntry(novelId, rec.id)),
    );

    const texts      = entries.map((e) => `${e.type} ${e.name}: ${e.body.slice(0, 500)}`);
    const embeddings = useGeminiEmb
      ? await embedLoreBatch(texts, aiConfig.geminiEmbeddingModel)
      : await embedBatch(texts);

    loreIndex.entries = loreIndex.entries.map((rec, i) => ({
      ...rec,
      snippet:   entries[i]?.body.slice(0, 300) ?? "",
      embedding: embeddings[i] ?? [],
      updatedAt: today,
    }));

    await updateLoreIndex(novelId, loreIndex);
    reindexed = entries.length;
  }

  // — Manuscript reindex —
  let manuscriptChunks = 0;
  let manuscriptError: string | undefined;

  const embeddingKeyMissing = useGeminiEmb
    ? !process.env.GEMINI_API_KEY
    : !process.env.OPENROUTER_API_KEY;

  if (embeddingKeyMissing) {
    const missing = useGeminiEmb ? "GEMINI_API_KEY" : "OPENROUTER_API_KEY";
    manuscriptError = `${missing} is not configured — skipping manuscript embedding`;
    msLog.warn("skipping — embedding API key not set", { novelId, missing });
  } else {
    msLog.info("start", { novelId, provider: useGeminiEmb ? "gemini" : "openrouter" });
    try {
      const { content: metaContent } = await getFile(`content/${novelId}/meta.json`);
      const meta = parseNovelMeta(metaContent);

      const slugs  = meta.chapterOrder ?? [];
      const titles = meta.chapterTitles ?? {};

      msLog.info("meta loaded", { chapterCount: slugs.length, firstSlugs: slugs.slice(0, 5) });
      if (slugs.length === 0) {
        msLog.warn("meta.chapterOrder is empty — no manuscript chapters to embed", { novelId });
      }

      const existingIndex = await getManuscriptRagIndex(novelId);
      const existingBySlug = new Map<string, ManuscriptRagRecord[]>();
      for (const entry of existingIndex.entries) {
        const arr = existingBySlug.get(entry.chapterSlug) ?? [];
        arr.push(entry);
        existingBySlug.set(entry.chapterSlug, arr);
      }

      const newEntries: ManuscriptRagRecord[] = [];
      const chapterErrors: Record<string, string> = {};

      const minBatchIntervalMs = Math.max(
        process.env.GEMINI_API_KEY ? GEMINI_TEXT_BATCH_MS : 0,
        !useGeminiEmb             ? NEMOTRON_BATCH_MS    : 0,
      );

      for (let i = 0; i < slugs.length; i += BATCH_SIZE) {
        const batchStart = Date.now();
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

        const isLastBatch = i + BATCH_SIZE >= slugs.length;
        if (!isLastBatch && minBatchIntervalMs > 0) {
          const elapsed  = Date.now() - batchStart;
          const cooldown = Math.max(0, minBatchIntervalMs - elapsed);
          if (cooldown > 0) {
            msLog.info("rate-limit cooldown", {
              cooldownMs:   cooldown,
              elapsedMs:    elapsed,
              nextBatch:    i + BATCH_SIZE,
              totalBatches: Math.ceil(slugs.length / BATCH_SIZE),
            });
            await sleep(cooldown);
          }
        }
      }

      if (slugs.length > 0) {
        await updateManuscriptRagIndex(novelId, { entries: newEntries });
      }

      if (Object.keys(chapterErrors).length > 0) {
        manuscriptError = JSON.stringify(chapterErrors);
        msLog.error("finished with chapter errors", { novelId, errorSlugs: Object.keys(chapterErrors), chapterErrors });
      } else {
        msLog.info("finished OK", { novelId, manuscriptChunks, indexEntryCount: newEntries.length });
      }

      // — Global Bible rebuild —
      if (process.env.GEMINI_API_KEY && newEntries.length > 0) {
        try {
          await rebuildGlobalBible(novelId, newEntries);
        } catch (e) {
          msLog.error("global bible generation failed (non-fatal)", {
            novelId,
            message: e instanceof Error ? e.message : String(e),
          });
        }
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
