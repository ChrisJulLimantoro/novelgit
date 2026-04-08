import { z } from "zod";

export const ManuscriptRagRecordSchema = z.object({
  chapterSlug:  z.string(),
  chunkIndex:   z.number().int().nonnegative(),
  chapterTitle: z.string(),
  /** Always [] in manuscript-rag-index.json; embeddings live in per-chapter shard files. */
  embedding:    z.array(z.number()),
  text:         z.string(),
  updatedAt:    z.string(),
});
export type ManuscriptRagRecord = z.infer<typeof ManuscriptRagRecordSchema>;

export const ManuscriptRagIndexSchema = z.object({
  entries: z.array(ManuscriptRagRecordSchema),
});
export type ManuscriptRagIndex = z.infer<typeof ManuscriptRagIndexSchema>;

/** Per-chapter embedding shard stored at manuscript-rag-emb/{chapterSlug}.json */
export const ManuscriptEmbShardEntrySchema = z.object({
  chunkIndex: z.number().int().nonnegative(),
  embedding:  z.array(z.number()),
});
export type ManuscriptEmbShardEntry = z.infer<typeof ManuscriptEmbShardEntrySchema>;

export const ManuscriptEmbShardSchema = z.object({
  entries: z.array(ManuscriptEmbShardEntrySchema),
});
export type ManuscriptEmbShard = z.infer<typeof ManuscriptEmbShardSchema>;
