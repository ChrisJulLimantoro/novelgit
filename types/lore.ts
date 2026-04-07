import { z } from "zod";

export const LORE_TYPES = ["character", "location", "faction", "event", "item"] as const;
export type LoreType = (typeof LORE_TYPES)[number];

export const LoreEntryMetaSchema = z.object({
  id:      z.string(),
  type:    z.enum(LORE_TYPES),
  name:    z.string(),
  tags:    z.array(z.string()).default([]),
  created: z.string(),
});
export type LoreEntryMeta = z.infer<typeof LoreEntryMetaSchema>;

export const LoreEntrySchema = LoreEntryMetaSchema.extend({
  body: z.string(),
  sha:  z.string(),
});
export type LoreEntry = z.infer<typeof LoreEntrySchema>;

export const LoreIndexRecordSchema = z.object({
  id:        z.string(),
  type:      z.enum(LORE_TYPES),
  name:      z.string(),
  tags:      z.array(z.string()).default([]),
  embedding: z.array(z.number()),
  updatedAt: z.string(),
});
export type LoreIndexRecord = z.infer<typeof LoreIndexRecordSchema>;

export const LoreIndexSchema = z.object({
  entries: z.array(LoreIndexRecordSchema),
});
export type LoreIndex = z.infer<typeof LoreIndexSchema>;

export const ChatMessageSchema = z.object({
  role:    z.enum(["user", "assistant"]),
  content: z.string(),
});
export type ChatMessage = z.infer<typeof ChatMessageSchema>;
