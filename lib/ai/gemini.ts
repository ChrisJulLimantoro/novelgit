/**
 * Google Gemini text generation via HTTPS REST — no SDK.
 * Used for chapter distillation (gemini-2.0-flash) and Global Bible
 * generation (gemini-1.5-flash, 1M context window).
 *
 * Returns '' when GEMINI_API_KEY is absent so callers can skip gracefully.
 */

const BASE_URL =
  "https://generativelanguage.googleapis.com/v1beta/models";

/** Any valid Gemini model ID string — validated at runtime by the API. */
export type GeminiModel = string;

interface GeminiCandidate {
  content?: { parts?: { text?: string }[] };
}

interface GeminiResponse {
  candidates?: GeminiCandidate[];
}

export async function generateText(
  prompt: string,
  model: GeminiModel = "gemini-2.0-flash",
): Promise<string> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return "";

  const url = `${BASE_URL}/${model}:generateContent?key=${key}`;

  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.2 },
      }),
    });
  } catch (e) {
    console.error(
      "[gemini] fetch threw (network / TLS / DNS?)",
      e instanceof Error ? { message: e.message } : String(e),
    );
    return "";
  }

  const raw = await res.text();
  if (!res.ok) {
    console.error(
      "[gemini] request failed",
      JSON.stringify({ status: res.status, model, bodyPreview: raw.slice(0, 800) }),
    );
    return "";
  }

  let parsed: GeminiResponse;
  try {
    parsed = JSON.parse(raw) as GeminiResponse;
  } catch {
    console.error("[gemini] invalid JSON", { preview: raw.slice(0, 600) });
    return "";
  }

  return parsed.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
}
