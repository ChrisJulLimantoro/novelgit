"use server";

import { requireAuth } from "@/lib/auth";
import { assertSafeNovelId } from "@/lib/ids";
import { getLoreIndex, getLoreEntry } from "@/lib/lore";
import { topKResults } from "@/lib/ai/rag";
import type { LoreEntry } from "@/types/lore";

export async function searchLore(
  novelId: string,
  query:   string,
  k = 5,
): Promise<LoreEntry[]> {
  await requireAuth();
  assertSafeNovelId(novelId);

  const index = await getLoreIndex(novelId);
  if (index.entries.length === 0) return [];

  // If no embeddings yet, fall back to name-based search
  const hasEmbeddings = index.entries.some((e) => e.embedding.length > 0);
  if (!hasEmbeddings) {
    const q = query.toLowerCase();
    const matches = index.entries
      .filter((e) => e.name.toLowerCase().includes(q) || e.tags.some((t) => t.includes(q)))
      .slice(0, k);
    return Promise.all(matches.map((rec) => getLoreEntry(novelId, rec.id)));
  }

  try {
    const { embedText } = await import("@/lib/ai/embeddings");
    const queryEmbedding = await embedText(query);
    const topRecords     = topKResults(index, queryEmbedding, k);
    return Promise.all(topRecords.map((rec) => getLoreEntry(novelId, rec.id)));
  } catch {
    // Fallback to text search if embeddings fail
    const q = query.toLowerCase();
    const matches = index.entries
      .filter((e) => e.name.toLowerCase().includes(q) || e.tags.some((t) => t.includes(q)))
      .slice(0, k);
    return Promise.all(matches.map((rec) => getLoreEntry(novelId, rec.id)));
  }
}
