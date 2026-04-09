import { z } from "zod";

export const AiConfigSchema = z.object({
  /** Gemini model ID used for chapter distillation during reindex. */
  distillationModel:   z.string().default("gemini-3.1-flash-lite-preview"),
  /** Gemini model ID used for full Global Bible rebuild (needs large context). */
  bibleRebuildModel:   z.string().default("gemini-3-flash-preview"),
  /** Gemini model ID used for incremental Global Bible patch (single chapter). */
  biblePatchModel:     z.string().default("gemini-3.1-flash-lite-preview"),
  /**
   * Embedding backend.
   * "current"  — Voyage (lore) + OpenRouter Nemotron (manuscript). Requires VOYAGE_API_KEY + OPENROUTER_API_KEY.
   * "gemini"   — Gemini Embedding 2 for both. Requires only GEMINI_API_KEY. Full reindex required after switching.
   */
  embeddingProvider:   z.enum(["current", "gemini"]).default("current"),
  /** Gemini embedding model ID. Only used when embeddingProvider === "gemini". */
  geminiEmbeddingModel: z.string().default("gemini-embedding-001"),
});

export type AiConfig = z.infer<typeof AiConfigSchema>;

export const AI_CONFIG_DEFAULTS: AiConfig = AiConfigSchema.parse({});

/** Preset model options shown in the settings UI. User can also type a custom ID. */
export const GEMINI_TEXT_MODELS = [
  { id: "gemini-3.1-flash-lite-preview",      label: "Gemini 3.1 Flash Lite",       note: "Fast · 500 RPD free" },
  { id: "gemini-3-flash-preview",      label: "Gemini 3 Flash",       note: "Quality · 20 RPD free" },
] as const;

export const GEMINI_EMBEDDING_MODELS = [
  { id: "gemini-embedding-001",          label: "Gemini Embedding 1",         note: "3072d · MTEB #1" },
  { id: "gemini-embedding-2-preview",    label: "Gemini Embedding 2 Preview", note: "3072d · multimodal" },
] as const;
