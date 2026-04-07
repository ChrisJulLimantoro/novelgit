import { getFile, putFile } from "./github-content";
import { assertSafeChapterSlug, assertSafeNovelId } from "./ids";
import { ManuscriptRagIndexSchema } from "@/types/manuscript-rag";
import type { ManuscriptRagIndex } from "@/types/manuscript-rag";

/** * Smaller chunks (1000 chars) help MiniLM keep specific names 
 * from being "drowned out" by surrounding prose.
 */
const MANUSCRIPT_CHUNK_CHARS = 1000;

function manuscriptRagIndexPath(novelId: string) {
  return `content/${novelId}/manuscript-rag-index.json`;
}

export function chunkManuscriptMarkdown(markdown: string): string[] {
  const text = markdown.trim();
  if (!text) return [];

  const paras = text.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  const chunks: string[] = [];
  let buf = "";

  const flush = () => {
    const t = buf.trim();
    if (t) chunks.push(t);
    buf = "";
  };

  for (const p of paras) {
    if (buf.length + p.length + 2 > MANUSCRIPT_CHUNK_CHARS && buf) flush();
    if (p.length > MANUSCRIPT_CHUNK_CHARS) {
      flush();
      for (let i = 0; i < p.length; i += MANUSCRIPT_CHUNK_CHARS) {
        chunks.push(p.slice(i, i + MANUSCRIPT_CHUNK_CHARS));
      }
      continue;
    }
    buf = buf ? `${buf}\n\n${p}` : p;
  }
  flush();
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
  let sha = "";
  try {
    const existing = await getFile(manuscriptRagIndexPath(novelId));
    sha = existing.sha;
  } catch {}
  
  await putFile(
    manuscriptRagIndexPath(novelId),
    JSON.stringify(index, null, 2),
    sha,
    `chore: update manuscript-rag-index ${novelId}`
  );
}

/** Load live chapter text for a stored chunk index (skips stale rows). */

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
    const t = chunks[chunkIndex];
    return t ?? null;
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