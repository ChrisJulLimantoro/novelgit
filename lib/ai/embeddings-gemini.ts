/**
 * Gemini Embedding 2 via HTTPS REST — no SDK.
 * Replaces both Voyage (lore) and OpenRouter Nemotron (manuscript) when
 * embeddingProvider === "gemini" in ai-config.json.
 *
 * Model:      gemini-embedding-001 (default) — 3072d, MTEB #1
 * Endpoint:   generativelanguage.googleapis.com/v1beta/models/{model}:batchEmbedContents
 * Matryoshka: outputDimensionality parameter truncates to any size ≤ 3072.
 *
 * We use 1024d for lore (matches Voyage-3 — no scoring recalibration needed)
 * and 2048d for manuscript (matches Nemotron — same shard schema).
 */

const BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models";

export const GEMINI_LORE_DIMS       = 1024;
export const GEMINI_MANUSCRIPT_DIMS = 2048;

interface GeminiEmbeddingValue {
  values?: number[];
}

interface GeminiEmbeddingResponse {
  embeddings?: GeminiEmbeddingValue[];
}

async function batchEmbed(
  texts: string[],
  model: string,
  outputDimensionality: number,
): Promise<number[][]> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY is not configured");

  const url = `${BASE_URL}/${model}:batchEmbedContents?key=${key}`;

  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        requests: texts.map((text) => ({
          model: `models/${model}`,
          content: { parts: [{ text }] },
          outputDimensionality,
        })),
      }),
    });
  } catch (e) {
    console.error(
      "[gemini:embed] fetch threw",
      e instanceof Error ? { message: e.message } : String(e),
    );
    throw e;
  }

  const raw = await res.text();
  if (!res.ok) {
    console.error("[gemini:embed] request failed", {
      status: res.status,
      model,
      bodyPreview: raw.slice(0, 800),
    });
    throw new Error(`Gemini embedding failed (${res.status}): ${raw.slice(0, 300)}`);
  }

  let parsed: GeminiEmbeddingResponse;
  try {
    parsed = JSON.parse(raw) as GeminiEmbeddingResponse;
  } catch {
    console.error("[gemini:embed] invalid JSON", { preview: raw.slice(0, 400) });
    throw new Error("Gemini embedding: invalid JSON response");
  }

  const rows = parsed.embeddings ?? [];
  if (rows.length !== texts.length) {
    throw new Error(
      `Gemini embedding: expected ${texts.length} rows, got ${rows.length}`,
    );
  }
  return rows.map((r) => r.values ?? []);
}

// ── Lore embeddings (1024d — matches Voyage-3 dimension) ──────────────────

export async function embedLoreText(
  text: string,
  model = "gemini-embedding-001",
): Promise<number[]> {
  const [vec] = await batchEmbed([text], model, GEMINI_LORE_DIMS);
  return vec ?? [];
}

export async function embedLoreBatch(
  texts: string[],
  model = "gemini-embedding-001",
): Promise<number[][]> {
  if (texts.length === 0) return [];
  return batchEmbed(texts, model, GEMINI_LORE_DIMS);
}

// ── Manuscript embeddings (2048d — matches Nemotron dimension) ────────────

export async function embedManuscriptText(
  text: string,
  model = "gemini-embedding-001",
): Promise<number[]> {
  const [vec] = await batchEmbed([text], model, GEMINI_MANUSCRIPT_DIMS);
  return vec ?? [];
}

export async function embedManuscriptBatch(
  texts: string[],
  model = "gemini-embedding-001",
): Promise<number[][]> {
  if (texts.length === 0) return [];
  return batchEmbed(texts, model, GEMINI_MANUSCRIPT_DIMS);
}
