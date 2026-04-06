"use server";

import { revalidatePath } from "next/cache";
import { getFile, putFile } from "@/lib/github-content";
import { LibrarySchema, type Novel, type Genre } from "@/types/novel";
import { requireAuth } from "@/lib/auth";
import { assertSafeNovelId } from "@/lib/ids";

export async function getLibrary() {
  await requireAuth();
  const { content } = await getFile("config/novels.json");
  return LibrarySchema.parse(JSON.parse(content));
}

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

function parseGenresJson(raw: string): string[] {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((g): g is string => typeof g === "string");
  } catch {
    return [];
  }
}

export async function createNovel(formData: FormData) {
  await requireAuth();
  const title = formData.get("title") as string;
  const genresRaw = (formData.get("genres") as string) ?? "[]";
  const genres = parseGenresJson(genresRaw);

  const { content, sha } = await getFile("config/novels.json");
  const library = LibrarySchema.parse(JSON.parse(content));

  let id = slugify(title);
  const existingIds = new Set(library.novels.map((n) => n.id));
  let suffix = 1;
  while (existingIds.has(id)) {
    id = `${slugify(title)}-${suffix++}`;
  }

  const newNovel: Novel = { id, title, path: `content/${id}`, status: "planning", genres };
  library.novels.push(newNovel);

  await putFile("config/novels.json", JSON.stringify(library, null, 2), sha, `feat: add novel ${id}`);

  const meta = { id, title, genres, goals: {}, chapterOrder: [] };
  await putFile(`content/${id}/meta.json`, JSON.stringify(meta, null, 2), "", `chore: scaffold ${id}`);
  await putFile(`content/${id}/manuscript/.gitkeep`, "", "", `chore: scaffold ${id} manuscript`);
  await putFile(`content/${id}/lore/.gitkeep`, "", "", `chore: scaffold ${id} lore`);

  revalidatePath("/library");
}

export async function updateNovel(
  novelId: string,
  data: { title: string; status: Novel["status"]; genres: Genre[] },
) {
  await requireAuth();
  assertSafeNovelId(novelId);

  const { content: regContent, sha: regSha } = await getFile("config/novels.json");
  const library = LibrarySchema.parse(JSON.parse(regContent));
  const idx = library.novels.findIndex((n) => n.id === novelId);
  if (idx === -1) throw new Error(`Novel ${novelId} not found`);
  library.novels[idx] = { ...library.novels[idx], ...data };
  await putFile("config/novels.json", JSON.stringify(library, null, 2), regSha, `feat: update novel ${novelId}`);

  const metaPath = `content/${novelId}/meta.json`;
  const { content: metaContent, sha: metaSha } = await getFile(metaPath);
  let meta: Record<string, unknown>;
  try {
    meta = JSON.parse(metaContent) as Record<string, unknown>;
  } catch {
    throw new Error("Invalid meta.json");
  }
  meta.title = data.title;
  meta.genres = data.genres;
  await putFile(metaPath, JSON.stringify(meta, null, 2), metaSha, `chore: update meta ${novelId}`);

  revalidatePath(`/library/${novelId}`);
  revalidatePath("/library");
}
