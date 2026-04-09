"use server";

import { revalidatePath } from "next/cache";
import { getFile, putFile } from "@/lib/github-content";
import { countWords } from "@/lib/word-count";
import { requireAuth } from "@/lib/auth";
import { assertSafeChapterSlug, assertSafeNovelId } from "@/lib/ids";
import {
  getManuscriptRagIndex,
  updateManuscriptRagIndex,
  getGlobalBible,
  updateGlobalBible,
} from "@/lib/manuscript-rag";
import { reindexSingleChapter } from "@/lib/ai/manuscript-reindex";
import { patchGlobalBible } from "@/lib/ai/global-bible";
import { todayISO } from "@/lib/utils";
import { parseNovelMeta } from "@/lib/novel-meta";

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
  const today = todayISO();

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
  const meta = parseNovelMeta(content);
  meta.chapterOrder = chapterOrder;
  await putFile(metaPath, JSON.stringify(meta, null, 2), sha, `chore: reorder chapters for ${novelId}`);
  revalidatePath(`/edit/${novelId}`);
}

export async function createChapter(novelId: string, title: string) {
  await requireAuth();
  assertSafeNovelId(novelId);

  const metaPath = `content/${novelId}/meta.json`;
  const { content, sha } = await getFile(metaPath);
  const meta = parseNovelMeta(content);

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

/**
 * Reindex a single chapter's RAG embeddings.
 * Cheaper than full reindex: 1 OpenRouter batch call per chapter instead of N.
 * Call this from the editor after finishing a writing session, not on every save.
 */
export async function reindexChapter(
  novelId: string,
  chapterSlug: string,
): Promise<{ ok: boolean; chunks: number; error?: string }> {
  await requireAuth();
  assertSafeNovelId(novelId);
  assertSafeChapterSlug(chapterSlug);

  // Load chapter title from meta (best-effort)
  let title = chapterSlug;
  try {
    const { content } = await getFile(`content/${novelId}/meta.json`);
    const meta = parseNovelMeta(content);
    title = meta.chapterTitles?.[chapterSlug] ?? chapterSlug;
  } catch {}

  const result = await reindexSingleChapter(novelId, chapterSlug, title);
  if (!result.ok) return { ok: false, chunks: 0, error: result.error };
  if (result.chunks === 0) return { ok: true, chunks: 0 };

  // Merge new entries into the index, replacing only this chapter's old entries
  const index = await getManuscriptRagIndex(novelId);
  const otherEntries = index.entries.filter((e) => e.chapterSlug !== chapterSlug);
  await updateManuscriptRagIndex(novelId, { entries: [...otherEntries, ...result.entries] });

  // Patch Global Bible with this chapter's updated summary (non-fatal)
  if (process.env.GEMINI_API_KEY && result.summary) {
    try {
      const existing = await getGlobalBible(novelId);
      const patched  = await patchGlobalBible(existing, {
        chapterTitle: title,
        summary:      result.summary,
        tags:         result.tags,
      });
      if (patched) await updateGlobalBible(novelId, patched);
    } catch (e) {
      console.error("[reindexChapter] global bible patch failed (non-fatal)", String(e));
    }
  }

  return { ok: true, chunks: result.chunks };
}

export async function renameChapterTitle(novelId: string, slug: string, title: string) {
  await requireAuth();
  assertSafeNovelId(novelId);
  assertSafeChapterSlug(slug);

  const metaPath = `content/${novelId}/meta.json`;
  const { content, sha } = await getFile(metaPath);
  const meta = parseNovelMeta(content);
  meta.chapterTitles = { ...(meta.chapterTitles ?? {}), [slug]: title };
  await putFile(metaPath, JSON.stringify(meta, null, 2), sha, `chore: rename chapter ${slug}`);
  revalidatePath(`/edit/${novelId}/${slug}`);
  revalidatePath(`/library/${novelId}`);
}
