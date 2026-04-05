import { z } from "zod";

export const GENRES = [
  "Fantasy",
  "Science Fiction",
  "Romance",
  "Mystery",
  "Thriller",
  "Horror",
  "Literary Fiction",
  "Historical Fiction",
  "Young Adult",
  "Adventure",
  "Dystopian",
  "Paranormal",
  "Comedy",
  "Drama",
  "Short Story",
  "Non-Fiction",
] as const;

export type Genre = (typeof GENRES)[number];

export const NovelSchema = z.object({
  id:     z.string(),
  title:  z.string(),
  path:   z.string(),
  status: z.enum(["planning", "writing", "editing", "complete"]),
  genres: z.array(z.string()).default([]),
});

export const LibrarySchema = z.object({
  novels: z.array(NovelSchema),
});

export type Novel   = z.infer<typeof NovelSchema>;
export type Library = z.infer<typeof LibrarySchema>;
