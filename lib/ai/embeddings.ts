/**
 * Voyage embeddings via HTTPS. The official `voyageai` npm package’s ESM build
 * uses directory imports (`export * from "../api"`) that break Node’s ESM loader
 * when externalized and Turbopack when bundled — see next.config comment history.
 * Calling the REST API directly avoids the SDK entirely.
 */
const VOYAGE_EMBEDDINGS_URL = "https://api.voyageai.com/v1/embeddings";

const MODEL = "voyage-3";

interface VoyageEmbeddingItem {
  embedding?: number[];
  index?:   number;
}

interface VoyageEmbeddingsResponse {
  data?: VoyageEmbeddingItem[];
}

function assertKey(): void {
  if (!process.env.VOYAGE_API_KEY) {
    throw new Error("VOYAGE_API_KEY is not configured");
  }
}

async function postEmbeddings(input: string[]): Promise<number[][]> {
  assertKey();
  const res = await fetch(VOYAGE_EMBEDDINGS_URL, {
    method: "POST",
    headers: {
      "Content-Type":  "application/json",
      Authorization:   `Bearer ${process.env.VOYAGE_API_KEY}`,
    },
    body: JSON.stringify({
      input,
      model: MODEL,
    }),
  });

  const raw = await res.text();
  if (!res.ok) {
    throw new Error(`Voyage embeddings failed (${res.status}): ${raw.slice(0, 500)}`);
  }

  let parsed: VoyageEmbeddingsResponse;
  try {
    parsed = JSON.parse(raw) as VoyageEmbeddingsResponse;
  } catch {
    throw new Error("Voyage embeddings: invalid JSON response");
  }

  const rows = [...(parsed.data ?? [])].sort(
    (a, b) => (a.index ?? 0) - (b.index ?? 0),
  );
  if (rows.length !== input.length) {
    throw new Error(
      `Voyage embeddings: expected ${input.length} rows, got ${rows.length}`,
    );
  }
  return rows.map((r) => r.embedding ?? []);
}

export async function embedText(text: string): Promise<number[]> {
  const [vec] = await postEmbeddings([text]);
  return vec ?? [];
}

export async function embedBatch(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  return postEmbeddings(texts);
}
