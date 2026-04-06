const PREFIX = "draft";

export function draftKey(novelId: string, chapterSlug: string): string {
  return `${PREFIX}:${novelId}:${chapterSlug}`;
}

export interface Draft {
  content:   string;
  savedAt:   string; // ISO timestamp
}

export function saveDraft(novelId: string, chapterSlug: string, content: string): void {
  if (typeof window === "undefined") return;
  const draft: Draft = { content, savedAt: new Date().toISOString() };
  localStorage.setItem(draftKey(novelId, chapterSlug), JSON.stringify(draft));
}

export function loadDraft(novelId: string, chapterSlug: string): Draft | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(draftKey(novelId, chapterSlug));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Draft;
  } catch {
    localStorage.removeItem(draftKey(novelId, chapterSlug));
    return null;
  }
}

export function clearDraft(novelId: string, chapterSlug: string): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(draftKey(novelId, chapterSlug));
}
