/**
 * Manuscript embeddings via OpenRouter (nvidia/llama-nemotron-embed-vl-1b-v2:free).
 * Free tier: 20 req/min, 200 req/day. 2048 dimensions. OpenAI-compatible API.
 * Uses HTTPS REST directly — no SDK — to avoid ESM/Turbopack bundler issues.
 */
const OPENROUTER_EMBEDDINGS_URL = "https://openrouter.ai/api/v1/embeddings";
const MODEL = "nvidia/llama-nemotron-embed-vl-1b-v2:free";

export const MANUSCRIPT_EMB_DIMS = 2048;

interface OREmbeddingItem {
  embedding?: number[];
  index?: number;
}

interface OREmbeddingsResponse {
  data?: OREmbeddingItem[];
}

function assertKey(): void {
  if (!process.env.OPENROUTER_API_KEY) {
    throw new Error("OPENROUTER_API_KEY is not configured");
  }
}

async function postEmbeddings(input: string[]): Promise<number[][]> {
  assertKey();
  let res: Response;
  try {
    res = await fetch(OPENROUTER_EMBEDDINGS_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        input,
        encoding_format: "float",
        // Note: input_type omitted — Nemotron does not support it and returns data:[] when present
      }),
    });
  } catch (e) {
    console.error(
      "[openrouter:embeddings] fetch threw (network / TLS / DNS?)",
      e instanceof Error ? { message: e.message, stack: e.stack } : String(e),
    );
    throw e;
  }

  const raw = await res.text();
  if (!res.ok) {
    console.error(
      "[openrouter:embeddings] request failed",
      JSON.stringify({
        status:      res.status,
        statusText:  res.statusText,
        model:       MODEL,
        inputCount:  input.length,
        bodyPreview: raw.slice(0, 800),
      }),
    );
    throw new Error(`OpenRouter embeddings failed (${res.status}): ${raw.slice(0, 500)}`);
  }

  let parsed: OREmbeddingsResponse;
  try {
    parsed = JSON.parse(raw) as OREmbeddingsResponse;
  } catch {
    console.error("[openrouter:embeddings] invalid JSON", { preview: raw.slice(0, 600) });
    throw new Error("OpenRouter embeddings: invalid JSON response");
  }

  const rows = [...(parsed.data ?? [])].sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
  if (rows.length !== input.length) {
    // Log the full raw body so we can see what format the model actually returns
    console.error(
      "[openrouter:embeddings] row count mismatch",
      JSON.stringify({
        expected:    input.length,
        got:         rows.length,
        model:       MODEL,
        rawPreview:  raw.slice(0, 800),
        topLevelKeys: Object.keys(parsed),
        sampleKeys:  parsed.data?.[0] != null ? Object.keys(parsed.data[0]) : [],
      }),
    );
    throw new Error(
      `OpenRouter embeddings: expected ${input.length} rows, got ${rows.length}`,
    );
  }
  const out = rows.map((r) => r.embedding ?? []);
  const bad = out.findIndex((v) => !v.length);
  if (bad >= 0) {
    console.error(
      "[openrouter:embeddings] empty embedding vector",
      JSON.stringify({ index: bad, rowKeys: Object.keys(rows[bad] ?? {}) }),
    );
  }
  return out;
}

// Note: Nemotron does not support an `input_type` field — it returns an empty
// `data` array when the field is present. Both functions below omit it.

export async function embedTextMs(text: string): Promise<number[]> {
  const [vec] = await postEmbeddings([text]);
  return vec ?? [];
}

export async function embedBatchMs(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  return postEmbeddings(texts);
}
