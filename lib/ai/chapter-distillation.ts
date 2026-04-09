import { generateText } from "./gemini";
import { getAiConfig } from "./ai-config";

export interface ChapterDistillation {
  summary: string;
  entities: string[];
  tags: string;
}

const EMPTY: ChapterDistillation = { summary: "", entities: [], tags: "" };

/**
 * Distills a chapter into a structured summary, entity list, and scene tags.
 * Model is read from ai-config.json (defaults to gemini-2.0-flash).
 * Returns empty fields if GEMINI_API_KEY is absent or the call fails.
 */
export async function distillChapter(
  chapterTitle: string,
  markdown: string,
): Promise<ChapterDistillation> {
  // Strip markdown syntax for a cleaner prose input (keep newlines)
  const prose = markdown
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/`(.+?)`/g, "$1")
    .trim();

  if (!prose) return EMPTY;

  if (!process.env.GEMINI_API_KEY) {
    console.warn("[chapter-distillation] GEMINI_API_KEY not set — skipping distillation, global bible will not be generated");
    return EMPTY;
  }

  const config = await getAiConfig();
  const model  = config.distillationModel;

  const prompt = `You are a story analyst. Analyze this chapter and respond with ONLY valid JSON — no markdown fences, no extra text.

Chapter title: "${chapterTitle}"

Chapter content:
${prose.slice(0, 8000)}

Respond with this exact JSON shape:
{
  "summary": "2-3 sentences covering the main events, turning points, and emotional beats of this chapter.",
  "entities": ["Character or location name", "Another name"],
  "tags": "comma-separated scene keywords, e.g. confrontation, heir reveal, library, first meeting"
}`;

  const raw = await generateText(prompt, model);
  if (!raw) return EMPTY;

  try {
    // Strip any accidental markdown fences Gemini might add
    const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
    const parsed = JSON.parse(cleaned) as Partial<ChapterDistillation>;
    return {
      summary:  typeof parsed.summary  === "string" ? parsed.summary  : "",
      entities: Array.isArray(parsed.entities)       ? parsed.entities : [],
      tags:     typeof parsed.tags     === "string" ? parsed.tags     : "",
    };
  } catch {
    console.error("[chapter-distillation] failed to parse JSON from Gemini", {
      chapterTitle,
      preview: raw.slice(0, 400),
    });
    return EMPTY;
  }
}
