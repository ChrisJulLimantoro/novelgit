"use server";

import { revalidatePath } from "next/cache";
import { getFile, putFile } from "@/lib/github-content";
import { countWords } from "@/lib/word-count";

export async function loadChapter(novelId: string, chapterSlug: string) {
  const path = `content/${novelId}/manuscript/${chapterSlug}.md`;
  return getFile(path);
}

export async function syncChapter(novelId: string, chapterSlug: string, content: string) {
  const path = `content/${novelId}/manuscript/${chapterSlug}.md`;
  const { sha } = await getFile(path);
  await putFile(path, content, sha, `draft: update ${chapterSlug}`);

  // Record analytics
  const wordCount = countWords(content);
  const today = new Date().toISOString().slice(0, 10);

  let analyticsContent = "[]";
  let analyticsSha = "";
  try {
    const a = await getFile(`content/${novelId}/analytics.json`);
    analyticsContent = a.content;
    analyticsSha = a.sha;
  } catch { /* file doesn't exist yet */ }

  const entries: { date: string; wordCount: number }[] = JSON.parse(analyticsContent);
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

  revalidatePath(`/edit/${novelId}/${chapterSlug}`);
  return { ok: true, timestamp: new Date().toISOString() };
}

export async function reorderChapters(novelId: string, chapterOrder: string[]) {
  const metaPath = `content/${novelId}/meta.json`;
  const { content, sha } = await getFile(metaPath);
  const meta = JSON.parse(content);
  meta.chapterOrder = chapterOrder;
  await putFile(metaPath, JSON.stringify(meta, null, 2), sha, `chore: reorder chapters for ${novelId}`);
  revalidatePath(`/edit/${novelId}`);
}

export async function createChapter(novelId: string, title: string) {
  const metaPath = `content/${novelId}/meta.json`;
  const { content, sha } = await getFile(metaPath);
  const meta = JSON.parse(content);

  // Build slug: zero-padded index + slugified title
  const idx = (meta.chapterOrder?.length ?? 0) + 1;
  const slugBase = title.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  const slug = `${String(idx).padStart(2, "0")}-${slugBase}`;

  // Create the chapter file
  await putFile(`content/${novelId}/manuscript/${slug}.md`, `# ${title}\n\n`, "", `feat: new chapter ${slug}`);

  meta.chapterOrder = [...(meta.chapterOrder ?? []), slug];
  await putFile(metaPath, JSON.stringify(meta, null, 2), sha, `chore: register chapter ${slug}`);

  revalidatePath(`/edit/${novelId}`);
  return slug;
}
