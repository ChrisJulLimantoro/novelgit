"use server";

import { revalidatePath } from "next/cache";
import { getFile, putFile } from "@/lib/github-content";
import { countWords } from "@/lib/word-count";
import { requireAuth } from "@/lib/auth";
import { assertSafeChapterSlug, assertSafeNovelId } from "@/lib/ids";

function parseMeta(content: string): {
  chapterOrder?:  string[];
  chapterTitles?: Record<string, string>;
} {
  let o: unknown;
  try {
    o = JSON.parse(content);
  } catch {
    throw new Error("Invalid meta.json");
  }
  if (!o || typeof o !== "object" || Array.isArray(o)) {
    throw new Error("Invalid meta.json");
  }
  return o as { chapterOrder?: string[]; chapterTitles?: Record<string, string> };
}

export async function loadChapter(novelId: string, chapterSlug: string) {
  await requireAuth();
  assertSafeNovelId(novelId);
  assertSafeChapterSlug(chapterSlug);
  const path = `content/${novelId}/manuscript/${chapterSlug}.md`;
  return getFile(path);
}

export async function syncChapter(novelId: string, chapterSlug: string, content: string) {
  await requireAuth();
  assertSafeNovelId(novelId);
  assertSafeChapterSlug(chapterSlug);

  const path = `content/${novelId}/manuscript/${chapterSlug}.md`;
  const { sha } = await getFile(path);
  await putFile(path, content, sha, `draft: update ${chapterSlug}`);

  const wordCount = countWords(content);
  const today = new Date().toISOString().slice(0, 10);

  try {
    let analyticsContent = "[]";
    let analyticsSha = "";
    try {
      const a = await getFile(`content/${novelId}/analytics.json`);
      analyticsContent = a.content;
      analyticsSha = a.sha;
    } catch {
      /* file doesn't exist yet */
    }

    let entries: { date: string; wordCount: number }[];
    try {
      const parsed: unknown = JSON.parse(analyticsContent);
      entries = Array.isArray(parsed) ? (parsed as { date: string; wordCount: number }[]) : [];
    } catch {
      entries = [];
    }

    const existing = entries.find((e) => e.date === today);
    if (existing) {
      existing.wordCount = wordCount;
    } else {
      entries.push({ date: today, wordCount });
    }

    await putFile(
      `content/${novelId}/analytics.json`,
      JSON.stringify(entries, null, 2),
      analyticsSha,
      `chore: analytics ${novelId} ${today}`,
    );
  } catch (e) {
    console.warn("Analytics update failed:", e);
  }

  revalidatePath(`/edit/${novelId}/${chapterSlug}`);
  return { ok: true, timestamp: new Date().toISOString() };
}

export async function reorderChapters(novelId: string, chapterOrder: string[]) {
  await requireAuth();
  assertSafeNovelId(novelId);
  for (const slug of chapterOrder) assertSafeChapterSlug(slug);

  const metaPath = `content/${novelId}/meta.json`;
  const { content, sha } = await getFile(metaPath);
  const meta = parseMeta(content);
  meta.chapterOrder = chapterOrder;
  await putFile(metaPath, JSON.stringify(meta, null, 2), sha, `chore: reorder chapters for ${novelId}`);
  revalidatePath(`/edit/${novelId}`);
}

export async function createChapter(novelId: string, title: string) {
  await requireAuth();
  assertSafeNovelId(novelId);

  const metaPath = `content/${novelId}/meta.json`;
  const { content, sha } = await getFile(metaPath);
  const meta = parseMeta(content);

  const idx = (meta.chapterOrder?.length ?? 0) + 1;
  const slugBase =
    title.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "") || "chapter";

  const order = meta.chapterOrder ?? [];
  const titles = meta.chapterTitles ?? {};
  let slug = `${String(idx).padStart(2, "0")}-${slugBase}`;
  let n = 0;
  while (order.includes(slug) || slug in titles) {
    n++;
    slug = `${String(idx).padStart(2, "0")}-${slugBase}-${n}`;
  }

  meta.chapterOrder = [...order, slug];
  meta.chapterTitles = { ...titles, [slug]: title };
  await putFile(metaPath, JSON.stringify(meta, null, 2), sha, `chore: register chapter ${slug}`);

  await putFile(`content/${novelId}/manuscript/${slug}.md`, `# ${title}\n\n`, "", `feat: new chapter ${slug}`);

  revalidatePath(`/edit/${novelId}`);
  revalidatePath(`/library/${novelId}`);
  return slug;
}

export async function renameChapterTitle(novelId: string, slug: string, title: string) {
  await requireAuth();
  assertSafeNovelId(novelId);
  assertSafeChapterSlug(slug);

  const metaPath = `content/${novelId}/meta.json`;
  const { content, sha } = await getFile(metaPath);
  const meta = parseMeta(content);
  meta.chapterTitles = { ...(meta.chapterTitles ?? {}), [slug]: title };
  await putFile(metaPath, JSON.stringify(meta, null, 2), sha, `chore: rename chapter ${slug}`);
  revalidatePath(`/edit/${novelId}/${slug}`);
  revalidatePath(`/library/${novelId}`);
}
