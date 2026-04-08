/**
 * Single-chapter manuscript reindex: chunk → embed → save shard.
 * Used by both the full-reindex API route and the per-chapter server action.
 */
import { getFile } from "@/lib/github-content";
import {
  chunkManuscriptMarkdown,
  manuscriptChunkEmbedText,
  saveManuscriptEmbShard,
} from "@/lib/manuscript-rag";
import { embedBatchMs } from "@/lib/ai/embeddings-openrouter";
import { MANUSCRIPT_EMB_DIMS } from "@/lib/ai/embeddings-openrouter";
import { todayISO } from "@/lib/utils";
import type { ManuscriptRagRecord } from "@/types/manuscript-rag";

const LOG = "[manuscript-reindex]";
const log = {
  info:  console.log.bind(console,   LOG),
  warn:  console.warn.bind(console,  LOG),
  error: console.error.bind(console, LOG),
};

export type ReindexChapterResult =
  | { ok: true; chunks: number; entries: ManuscriptRagRecord[] }
  | { ok: false; error: string };

/**
 * Chunk, embed, and shard a single chapter. Returns the new metadata entries
 * ready to be merged into the manuscript-rag-index.
 *
 * Does NOT read or write the index file itself — callers handle that so they
 * can orchestrate differently (single-chapter update vs. full rebuild).
 */
export async function reindexSingleChapter(
  novelId: string,
  slug:    string,
  title:   string,
): Promise<ReindexChapterResult> {
  const today = todayISO();

  // 1. Load chapter content
  let chapterContent: string;
  try {
    const { content } = await getFile(`content/${novelId}/manuscript/${slug}.md`);
    chapterContent = content;
  } catch (e) {
    const error = `fetch failed: ${String(e)}`;
    log.error("chapter file error", {
      slug, title, error,
      cause: e instanceof Error ? e.stack : undefined,
    });
    return { ok: false, error };
  }

  // 2. Chunk
  const chunks = chunkManuscriptMarkdown(chapterContent);
  if (chunks.length === 0) {
    log.warn("chapter has no chunks after split (empty or whitespace only?)", {
      slug, title, rawChars: chapterContent.length,
    });
    return { ok: true, chunks: 0, entries: [] };
  }

  const embedTexts = chunks.map((chunk, idx) =>
    manuscriptChunkEmbedText(title, slug, chunk, `part ${idx + 1} of ${chunks.length}`),
  );

  const totalEmbedChars = embedTexts.reduce((n, t) => n + t.length, 0);
  const maxInputLen = Math.max(...embedTexts.map((t) => t.length));
  log.info("embedding chapter", {
    slug, title, chunkCount: embedTexts.length, totalEmbedChars, maxInputLen,
  });

  // 3. Embed
  let embeddings: number[][];
  try {
    embeddings = await embedBatchMs(embedTexts);
  } catch (e) {
    const error = `embed failed: ${String(e)}`;
    log.error("OpenRouter embed batch failed", {
      slug, title, chunkCount: embedTexts.length, totalEmbedChars, maxInputLen,
      message: e instanceof Error ? e.message : String(e),
      stack:   e instanceof Error ? e.stack : undefined,
    });
    return { ok: false, error };
  }

  // 4. Validate dimensions
  const lens = embeddings.map((v) => v.length);
  if (lens.filter((l) => l !== MANUSCRIPT_EMB_DIMS && l > 0).length > 0 || lens.some((l) => l === 0)) {
    log.warn("unexpected embedding dimensions", {
      slug, expected: MANUSCRIPT_EMB_DIMS,
      lengthsSample: lens.slice(0, 8),
      zeroCount: lens.filter((l) => l === 0).length,
    });
  } else {
    log.info("chapter embedded OK", {
      slug, vectors: embeddings.length, dims: embeddings[0]?.length ?? 0,
    });
  }

  // 5. Save per-chapter embedding shard
  try {
    await saveManuscriptEmbShard(
      novelId,
      slug,
      chunks.map((_, idx) => ({ chunkIndex: idx, embedding: embeddings[idx] ?? [] })),
    );
  } catch (e) {
    const error = `shard save failed: ${String(e)}`;
    log.error("saveManuscriptEmbShard failed", {
      slug,
      message: e instanceof Error ? e.message : String(e),
      stack:   e instanceof Error ? e.stack : undefined,
    });
    return { ok: false, error };
  }

  // 6. Build metadata entries (embeddings live in the shard, not the index)
  const entries: ManuscriptRagRecord[] = chunks.map((text, idx) => ({
    chapterSlug:  slug,
    chunkIndex:   idx,
    chapterTitle: title,
    embedding:    [],
    text,
    updatedAt:    today,
  }));

  return { ok: true, chunks: chunks.length, entries };
}
