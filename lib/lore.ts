import matter from "gray-matter";
import { getFile, putFile, deleteFile } from "./github-content";
import { assertSafeNovelId, assertSafeLoreSlug } from "./ids";
import { LoreEntryMetaSchema, LoreIndexSchema } from "@/types/lore";
import type { LoreEntry, LoreEntryMeta, LoreIndex } from "@/types/lore";

// ── Path helpers ──────────────────────────────────────────────────────────────

function lorePath(novelId: string, slug: string) {
  return `content/${novelId}/lore/${slug}.md`;
}

function loreIndexPath(novelId: string) {
  return `content/${novelId}/lore-index.json`;
}

// ── Slug helper ───────────────────────────────────────────────────────────────

export function slugifyLoreName(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "")
      .replace(/^-+|-+$/g, "")
      .slice(0, 127) || "entry"
  );
}

// ── Read ──────────────────────────────────────────────────────────────────────

export async function getLoreEntry(novelId: string, slug: string): Promise<LoreEntry> {
  assertSafeNovelId(novelId);
  assertSafeLoreSlug(slug);
  const { content, sha } = await getFile(lorePath(novelId, slug));
  const { data, content: body } = matter(content);
  const meta = LoreEntryMetaSchema.parse(data);
  return { ...meta, body: body.trim(), sha };
}

export async function getLoreIndex(novelId: string): Promise<LoreIndex> {
  assertSafeNovelId(novelId);
  try {
    const { content } = await getFile(loreIndexPath(novelId));
    return LoreIndexSchema.parse(JSON.parse(content));
  } catch {
    return { entries: [] };
  }
}

// ── Write ─────────────────────────────────────────────────────────────────────

function serializeLoreEntry(meta: LoreEntryMeta, body: string): string {
  return matter.stringify(`\n${body}`, {
    id:      meta.id,
    type:    meta.type,
    name:    meta.name,
    tags:    meta.tags,
    created: meta.created,
  });
}

export async function putLoreEntry(
  novelId:       string,
  meta:          LoreEntryMeta,
  body:          string,
  sha:           string,
  commitMessage: string,
): Promise<void> {
  assertSafeNovelId(novelId);
  assertSafeLoreSlug(meta.id);
  const content = serializeLoreEntry(meta, body);
  await putFile(lorePath(novelId, meta.id), content, sha, commitMessage);
}

export async function updateLoreIndex(novelId: string, index: LoreIndex): Promise<void> {
  assertSafeNovelId(novelId);
  let sha = "";
  try {
    const existing = await getFile(loreIndexPath(novelId));
    sha = existing.sha;
  } catch { /* first write — sha stays "" */ }
  await putFile(
    loreIndexPath(novelId),
    JSON.stringify(index, null, 2),
    sha,
    `chore: update lore-index ${novelId}`,
  );
}

export async function deleteLoreEntry(novelId: string, slug: string): Promise<void> {
  assertSafeNovelId(novelId);
  assertSafeLoreSlug(slug);
  const { sha } = await getFile(lorePath(novelId, slug));
  await deleteFile(lorePath(novelId, slug), sha, `chore: delete lore ${slug}`);
}
