/**
 * Local manuscript embeddings were removed (@xenova/transformers no longer a dependency).
 * Exports are kept so callers can be re-wired without reshaping the module API.
 */
export const MANUSCRIPT_EMBEDDER_ID = "Xenova/all-MiniLM-L6-v2";

function disabled(): never {
  throw new Error(
    "Local manuscript embeddings are disabled (Xenova/transformers removed from this project).",
  );
}

export async function embedTextLocal(_text: string): Promise<number[]> {
  disabled();
}

export async function embedBatchLocal(_texts: string[]): Promise<number[][]> {
  disabled();
}
