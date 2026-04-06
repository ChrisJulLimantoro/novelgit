/** GitHub path segments: lowercase slug, no slashes or traversal. */
const NOVEL_ID_RE = /^[a-z0-9][a-z0-9-]{0,63}$/;
const CHAPTER_SLUG_RE = /^[a-z0-9][a-z0-9-]{0,127}$/;

export function assertSafeNovelId(id: string): void {
  if (!NOVEL_ID_RE.test(id)) {
    throw new Error("Invalid novel id");
  }
}

export function assertSafeChapterSlug(slug: string): void {
  if (!CHAPTER_SLUG_RE.test(slug)) {
    throw new Error("Invalid chapter slug");
  }
}
