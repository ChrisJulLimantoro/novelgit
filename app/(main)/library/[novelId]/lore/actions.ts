"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth";
import { assertSafeNovelId } from "@/lib/ids";
import {
  getLoreEntry,
  putLoreEntry,
  deleteLoreEntry,
  getLoreIndex,
  updateLoreIndex,
  slugifyLoreName,
} from "@/lib/lore";
import type { LoreType, LoreEntry } from "@/types/lore";

async function getEmbedding(text: string): Promise<number[]> {
  try {
    const { embedText } = await import("@/lib/ai/embeddings");
    return await embedText(text);
  } catch {
    // Embeddings are best-effort — if keys not set, store empty array
    return [];
  }
}

// ── Create ─────────────────────────────────────────────────────────────────

export async function createLoreEntry(input: {
  novelId: string;
  name:    string;
  type:    LoreType;
  tags:    string[];
  body:    string;
}): Promise<{ slug: string }> {
  await requireAuth();
  assertSafeNovelId(input.novelId);

  const slug  = slugifyLoreName(input.name);
  const today = new Date().toISOString().slice(0, 10);
  const meta  = { id: slug, type: input.type, name: input.name, tags: input.tags, created: today };

  await putLoreEntry(input.novelId, meta, input.body, "", `feat: add lore ${slug}`);

  const embedInput = `${input.type} ${input.name}: ${input.body.slice(0, 500)}`;
  const embedding  = await getEmbedding(embedInput);

  const index = await getLoreIndex(input.novelId);
  index.entries.push({ id: slug, type: input.type, name: input.name, tags: input.tags, embedding, updatedAt: today });
  await updateLoreIndex(input.novelId, index);

  revalidatePath(`/library/${input.novelId}/lore`);
  return { slug };
}

// ── Update ──────────────────────────────────────────────────────────────────

export async function updateLoreEntry(input: {
  novelId: string;
  slug:    string;
  name:    string;
  type:    LoreType;
  tags:    string[];
  body:    string;
  sha:     string;
}): Promise<void> {
  await requireAuth();
  assertSafeNovelId(input.novelId);

  const existing = await getLoreEntry(input.novelId, input.slug);
  const today = new Date().toISOString().slice(0, 10);
  const meta  = {
    id:      input.slug,
    type:    input.type,
    name:    input.name,
    tags:    input.tags,
    created: existing.created,
  };

  await putLoreEntry(input.novelId, meta, input.body, input.sha, `chore: update lore ${input.slug}`);

  const embedInput = `${input.type} ${input.name}: ${input.body.slice(0, 500)}`;
  const embedding  = await getEmbedding(embedInput);

  const index = await getLoreIndex(input.novelId);
  const idx   = index.entries.findIndex((e) => e.id === input.slug);
  const record = { id: input.slug, type: input.type, name: input.name, tags: input.tags, embedding, updatedAt: today };
  if (idx >= 0) index.entries[idx] = record;
  else          index.entries.push(record);
  await updateLoreIndex(input.novelId, index);

  revalidatePath(`/library/${input.novelId}/lore`);
}

// ── Delete ──────────────────────────────────────────────────────────────────

export async function deleteLoreEntryAction(input: {
  novelId: string;
  slug:    string;
}): Promise<void> {
  await requireAuth();
  assertSafeNovelId(input.novelId);

  await deleteLoreEntry(input.novelId, input.slug);

  const index = await getLoreIndex(input.novelId);
  index.entries = index.entries.filter((e) => e.id !== input.slug);
  await updateLoreIndex(input.novelId, index);

  revalidatePath(`/library/${input.novelId}/lore`);
}

// ── List ───────────────────────────────────────────────────────────────────

export async function listLoreEntriesAction(
  novelId: string,
): Promise<{ id: string; type: LoreType; name: string; tags: string[]; updatedAt: string }[]> {
  await requireAuth();
  assertSafeNovelId(novelId);
  const index = await getLoreIndex(novelId);
  return index.entries.map(({ id, type, name, tags, updatedAt }) => ({ id, type, name, tags, updatedAt }));
}

// ── Get single ─────────────────────────────────────────────────────────────

export async function getLoreEntryAction(novelId: string, slug: string): Promise<LoreEntry> {
  await requireAuth();
  assertSafeNovelId(novelId);
  return getLoreEntry(novelId, slug);
}
