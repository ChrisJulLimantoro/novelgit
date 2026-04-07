import type { LoreIndex, LoreIndexRecord } from "@/types/lore";

export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot   += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

export function topKByEmbedding<T extends { embedding: number[] }>(
  items:          T[],
  queryEmbedding: number[],
  k:              number,
): T[] {
  if (items.length === 0 || queryEmbedding.length === 0) return [];
  return items
    .filter((e) => e.embedding.length > 0)
    .map((entry) => ({ entry, score: cosineSimilarity(queryEmbedding, entry.embedding) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, k)
    .map(({ entry }) => entry);
}

export function topKResults(
  index:          LoreIndex,
  queryEmbedding: number[],
  k = 5,
): LoreIndexRecord[] {
  return topKByEmbedding(index.entries, queryEmbedding, k);
}
