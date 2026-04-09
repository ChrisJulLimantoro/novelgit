import { getFile, getFileSha, putFile } from "./github-content";
import { assertSafeChapterSlug, assertSafeNovelId } from "./ids";
import {
  ManuscriptRagIndexSchema,
  ManuscriptRagManifestSchema,
  ManuscriptEmbShardSchema,
} from "@/types/manuscript-rag";
import type {
  ManuscriptRagIndex,
  ManuscriptRagManifest,
  ManuscriptEmbShardEntry,
} from "@/types/manuscript-rag";

/**
 * Smaller chunks (400 chars) with 1-paragraph overlap so adjacent-paragraph
 * attribution is always captured. Example: Kiyotaka named in P1, says "I love
 * you" in P2 — both paragraphs appear together in the same chunk.
 */
const MANUSCRIPT_CHUNK_CHARS = 400;

/** Max bytes per index shard — stays well under GitHub REST API's 1 MB soft limit. */
const INDEX_SHARD_LIMIT_BYTES = 750_000;

/** The manifest (or legacy single-file index) path. Always this file; content determines format. */
function manuscriptRagIndexPath(novelId: string) {
  return `content/${novelId}/manuscript-rag-index.json`;
}

function manuscriptRagShardPath(novelId: string, shardIndex: number) {
  return `content/${novelId}/manuscript-rag-index-${shardIndex}.json`;
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
    const raw = JSON.parse(content);

    // Legacy single-file format: { entries: [...] }
    if (Array.isArray(raw.entries)) {
      return ManuscriptRagIndexSchema.parse(raw);
    }

    // Sharded format: manifest → load all shards in parallel
    const manifest = ManuscriptRagManifestSchema.parse(raw);
    const shardEntries = await Promise.all(
      manifest.shards.map(async (_, i) => {
        try {
          const { content: sc } = await getFile(manuscriptRagShardPath(novelId, i));
          return ManuscriptRagIndexSchema.parse(JSON.parse(sc)).entries;
        } catch {
          return [];
        }
      }),
    );
    return { entries: shardEntries.flat() };
  } catch {
    return { entries: [] };
  }
}

export async function updateManuscriptRagIndex(novelId: string, index: ManuscriptRagIndex) {
  assertSafeNovelId(novelId);

  // Group entries by chapter slug (preserving order within each chapter)
  const byChapter = new Map<string, typeof index.entries>();
  for (const entry of index.entries) {
    const arr = byChapter.get(entry.chapterSlug) ?? [];
    arr.push(entry);
    byChapter.set(entry.chapterSlug, arr);
  }

  // Greedily pack chapters into shards up to INDEX_SHARD_LIMIT_BYTES
  const shards: (typeof index.entries)[] = [[]];
  const chapterShard: ManuscriptRagManifest["chapterShard"] = {};
  // Start with the overhead of wrapping { "entries": [] }
  let currentBytes = JSON.stringify({ entries: [] }).length;

  for (const [slug, entries] of byChapter) {
    // Estimate bytes this chapter adds (entries JSON + separating comma)
    const chunkBytes = JSON.stringify(entries).length + 1;
    const currentShard = shards[shards.length - 1]!;

    if (currentBytes + chunkBytes > INDEX_SHARD_LIMIT_BYTES && currentShard.length > 0) {
      // Current shard is full — open a new one
      shards.push([]);
      currentBytes = JSON.stringify({ entries: [] }).length;
    }

    shards[shards.length - 1]!.push(...entries);
    chapterShard[slug] = shards.length - 1;
    currentBytes += chunkBytes;
  }

  // Write all shards in parallel
  await Promise.all(
    shards.map(async (shardEntries, i) => {
      const path = manuscriptRagShardPath(novelId, i);
      const sha  = await getFileSha(path);
      await putFile(
        path,
        JSON.stringify({ entries: shardEntries }, null, 2),
        sha,
        `chore: update manuscript-rag-index-${i} ${novelId}`,
      );
    }),
  );

  // Write manifest (replaces old single-file index or previous manifest)
  const manifest: ManuscriptRagManifest = {
    version:      1,
    shards:       shards.map((_, i) => `manuscript-rag-index-${i}.json`),
    chapterShard,
  };
  const manifestSha = await getFileSha(manuscriptRagIndexPath(novelId));
  await putFile(
    manuscriptRagIndexPath(novelId),
    JSON.stringify(manifest, null, 2),
    manifestSha,
    `chore: update manuscript-rag-manifest ${novelId}`,
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

/**
 * Load live chapter text for a stored chunk.
 * FOR FRESHNESS CHECKS ONLY — never call this inside a retrieval loop.
 * Hot-path retrieval uses ManuscriptRagRecord.text which is stored at index time.
 */
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
  chapterSummary?: string,
  chapterTags?: string,
): string {
  const prefix =
    chapterSummary || chapterTags
      ? `[Summary: ${chapterSummary ?? ""}] [Tags: ${chapterTags ?? ""}] `
      : "";
  return `${prefix}From manuscript chapter "${chapterTitle}" (${chapterSlug}), ${partLabel}:\n${chunk}`;
}

// ---------------------------------------------------------------------------
// Global Bible — content/{novelId}/global-summary.md
// ---------------------------------------------------------------------------

function globalBiblePath(novelId: string) {
  return `content/${novelId}/global-summary.md`;
}

export async function getGlobalBible(novelId: string): Promise<string> {
  assertSafeNovelId(novelId);
  try {
    const { content } = await getFile(globalBiblePath(novelId));
    return content;
  } catch {
    return "";
  }
}

export async function updateGlobalBible(novelId: string, content: string): Promise<void> {
  assertSafeNovelId(novelId);
  const sha = await getFileSha(globalBiblePath(novelId));
  await putFile(
    globalBiblePath(novelId),
    content,
    sha,
    `chore: update global-summary ${novelId}`,
  );
}
