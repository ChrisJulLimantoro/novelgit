import { getFile, getFileSha, putFile } from "./github-content";
import { assertSafeChapterSlug, assertSafeNovelId } from "./ids";
import {
  ManuscriptRagIndexSchema,
  ManuscriptEmbShardSchema,
} from "@/types/manuscript-rag";
import type {
  ManuscriptRagIndex,
  ManuscriptEmbShardEntry,
} from "@/types/manuscript-rag";

/**
 * Smaller chunks (400 chars) with 1-paragraph overlap so adjacent-paragraph
 * attribution is always captured. Example: Kiyotaka named in P1, says "I love
 * you" in P2 — both paragraphs appear together in the same chunk.
 */
const MANUSCRIPT_CHUNK_CHARS = 400;

function manuscriptRagIndexPath(novelId: string) {
  return `content/${novelId}/manuscript-rag-index.json`;
}

export function manuscriptEmbShardPath(novelId: string, chapterSlug: string) {
  return `content/${novelId}/manuscript-rag-emb/${chapterSlug}.json`;
}

/**
 * Sliding-window paragraph chunker.
 * - Groups paragraphs into chunks ≤ MANUSCRIPT_CHUNK_CHARS.
 * - The last paragraph of each chunk becomes the first of the next (1-para overlap).
 * - Oversized single paragraphs are hard-split at the char limit.
 */
export function chunkManuscriptMarkdown(markdown: string): string[] {
  const text = markdown.trim();
  if (!text) return [];

  const paras = text.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  const chunks: string[] = [];
  let i = 0;

  while (i < paras.length) {
    const p = paras[i];

    // Hard-split oversized single paragraphs
    if (p.length > MANUSCRIPT_CHUNK_CHARS) {
      for (let j = 0; j < p.length; j += MANUSCRIPT_CHUNK_CHARS) {
        chunks.push(p.slice(j, j + MANUSCRIPT_CHUNK_CHARS));
      }
      i++;
      continue;
    }

    // Accumulate paragraphs until the chunk is full
    const buf: string[] = [p];
    let len = p.length;
    i++;

    while (i < paras.length) {
      const next = paras[i];
      if (next.length > MANUSCRIPT_CHUNK_CHARS) break; // let oversized handler take it
      if (len + 2 + next.length > MANUSCRIPT_CHUNK_CHARS) break;
      buf.push(next);
      len += 2 + next.length;
      i++;
    }

    chunks.push(buf.join("\n\n"));

    // 1-paragraph overlap: repeat last paragraph as first of next chunk,
    // but only when there's still content to process (prevents trailing dup).
    if (buf.length >= 2 && i < paras.length) i -= 1;
  }

  return chunks;
}

export async function getManuscriptRagIndex(novelId: string): Promise<ManuscriptRagIndex> {
  assertSafeNovelId(novelId);
  try {
    const { content } = await getFile(manuscriptRagIndexPath(novelId));
    return ManuscriptRagIndexSchema.parse(JSON.parse(content));
  } catch {
    return { entries: [] };
  }
}

export async function updateManuscriptRagIndex(novelId: string, index: ManuscriptRagIndex) {
  assertSafeNovelId(novelId);
  const sha = await getFileSha(manuscriptRagIndexPath(novelId));
  await putFile(
    manuscriptRagIndexPath(novelId),
    JSON.stringify(index, null, 2),
    sha,
    `chore: update manuscript-rag-index ${novelId}`,
  );
}

export async function getManuscriptEmbShard(
  novelId: string,
  chapterSlug: string,
): Promise<ManuscriptEmbShardEntry[]> {
  assertSafeNovelId(novelId);
  assertSafeChapterSlug(chapterSlug);
  try {
    const { content } = await getFile(manuscriptEmbShardPath(novelId, chapterSlug));
    return ManuscriptEmbShardSchema.parse(JSON.parse(content)).entries;
  } catch {
    return [];
  }
}

export async function saveManuscriptEmbShard(
  novelId: string,
  chapterSlug: string,
  shards: ManuscriptEmbShardEntry[],
): Promise<void> {
  assertSafeNovelId(novelId);
  assertSafeChapterSlug(chapterSlug);
  const path = manuscriptEmbShardPath(novelId, chapterSlug);
  const sha  = await getFileSha(path);
  await putFile(
    path,
    JSON.stringify({ entries: shards }, null, 2),
    sha,
    `chore: update manuscript-rag-emb ${chapterSlug} for ${novelId}`,
  );
}

/** Load live chapter text for a stored chunk (skips stale rows). */
export async function getManuscriptChunkText(
  novelId: string,
  chapterSlug: string,
  chunkIndex: number,
): Promise<string | null> {
  assertSafeNovelId(novelId);
  assertSafeChapterSlug(chapterSlug);
  try {
    const { content } = await getFile(`content/${novelId}/manuscript/${chapterSlug}.md`);
    const chunks = chunkManuscriptMarkdown(content);
    return chunks[chunkIndex] ?? null;
  } catch {
    return null;
  }
}

export function manuscriptChunkEmbedText(
  chapterTitle: string,
  chapterSlug: string,
  chunk: string,
  partLabel: string,
): string {
  return `From manuscript chapter "${chapterTitle}" (${chapterSlug}), ${partLabel}:\n${chunk}`;
}
