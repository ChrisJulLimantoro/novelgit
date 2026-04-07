import { z } from "zod";

export const ManuscriptRagRecordSchema = z.object({
  chapterSlug:  z.string(),
  chunkIndex:   z.number().int().nonnegative(),
  chapterTitle: z.string(),
  embedding:    z.array(z.number()),
  text:         z.string(),
  updatedAt:    z.string(),
});
export type ManuscriptRagRecord = z.infer<typeof ManuscriptRagRecordSchema>;

export const ManuscriptRagIndexSchema = z.object({
  /** Must match lib/ai/embeddings-local MANUSCRIPT_EMBEDDER_ID for semantic RAG. */
  embedder: z.string().optional(),
  entries:  z.array(ManuscriptRagRecordSchema),
});
export type ManuscriptRagIndex = z.infer<typeof ManuscriptRagIndexSchema>;
