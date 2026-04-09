import { z } from "zod";

export const ManuscriptRagRecordSchema = z.object({
  chapterSlug:    z.string(),
  chunkIndex:     z.number().int().nonnegative(),
  chapterTitle:   z.string(),
  /** Always [] in manuscript-rag-index.json; embeddings live in per-chapter shard files. */
  embedding:      z.array(z.number()),
  text:           z.string(),
  updatedAt:      z.string(),
  /** AI-generated chapter summary (Gemini 2.0 Flash). Empty string if GEMINI_API_KEY absent. */
  chapterSummary: z.string().default(""),
  /** Comma-separated scene tags from chapter distillation. E.g. "confrontation, heir reveal". */
  chapterTags:    z.string().default(""),
});
export type ManuscriptRagRecord = z.infer<typeof ManuscriptRagRecordSchema>;

export const ManuscriptRagIndexSchema = z.object({
  entries: z.array(ManuscriptRagRecordSchema),
});
export type ManuscriptRagIndex = z.infer<typeof ManuscriptRagIndexSchema>;

/** Per-chapter embedding shard stored at manuscript-rag-emb/{chapterSlug}.json */
/**
 * Manifest stored at manuscript-rag-index.json when the index is split into shards.
 * Detection: if the root JSON has a "shards" key it's this schema; if it has "entries" it's the
 * old single-file format (ManuscriptRagIndexSchema) — both are supported for backward compat.
 */
export const ManuscriptRagManifestSchema = z.object({
  version:      z.literal(1),
  /** Shard file names relative to the novel's content directory, e.g. ["manuscript-rag-index-0.json"]. */
  shards:       z.array(z.string()),
  /** Maps each chapterSlug to the shard index (0-based) that holds its entries. */
  chapterShard: z.record(z.string(), z.number().int().nonnegative()),
});
export type ManuscriptRagManifest = z.infer<typeof ManuscriptRagManifestSchema>;

export const ManuscriptEmbShardEntrySchema = z.object({
  chunkIndex: z.number().int().nonnegative(),
  embedding:  z.array(z.number()),
});
export type ManuscriptEmbShardEntry = z.infer<typeof ManuscriptEmbShardEntrySchema>;

export const ManuscriptEmbShardSchema = z.object({
  entries: z.array(ManuscriptEmbShardEntrySchema),
});
export type ManuscriptEmbShard = z.infer<typeof ManuscriptEmbShardSchema>;
