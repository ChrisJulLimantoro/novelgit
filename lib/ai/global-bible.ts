import { generateText } from "./gemini";
import { getAiConfig } from "./ai-config";

export interface ChapterSummaryInput {
  chapterTitle: string;
  summary: string;
  tags: string;
}

/**
 * Generates a full Global Bible from all chapter summaries.
 * Uses Gemini 1.5 Flash (1M context window) so even 100+ chapter summaries fit.
 * Called during full reindex. Returns '' if GEMINI_API_KEY absent.
 */
export async function generateGlobalBible(
  chapters: ChapterSummaryInput[],
): Promise<string> {
  if (chapters.length === 0) return "";

  const chapterList = chapters
    .map((c, i) => `### Chapter ${i + 1}: ${c.chapterTitle}\n${c.summary}\nTags: ${c.tags}`)
    .join("\n\n");

  const prompt = `You are a story archivist. Based on all the chapter summaries below, write a comprehensive Global Bible for this novel.

Structure your response in markdown with these sections:
## Major Plot Points
Key events and turning points in the story so far.

## Character Status
Each named character — who they are, current state, key relationships.

## World Rules & Lore
Established facts about the setting, magic system, factions, or rules.

## Open Threads
Unresolved mysteries, conflicts, and foreshadowed events.

---
CHAPTER SUMMARIES:

${chapterList}`;

  const { bibleRebuildModel } = await getAiConfig();
  return generateText(prompt, bibleRebuildModel);
}

/**
 * Patches the Global Bible with a single updated/new chapter summary.
 * Uses Gemini 2.0 Flash (small context, cheap).
 * Called during single-chapter reindex. Returns the existing bible unchanged if Gemini fails.
 */
export async function patchGlobalBible(
  existingBible: string,
  chapter: ChapterSummaryInput,
): Promise<string> {
  if (!existingBible && !chapter.summary) return existingBible;

  // If no existing bible, bootstrap one from this single chapter
  if (!existingBible) {
    return generateGlobalBible([chapter]);
  }

  const prompt = `You are a story archivist maintaining a Global Bible document.

A chapter has been added or updated. Integrate its information into the existing Global Bible.
Only modify sections that are affected by this chapter. Keep all other content intact.
Return the complete updated Global Bible in the same markdown structure.

UPDATED CHAPTER: "${chapter.chapterTitle}"
Summary: ${chapter.summary}
Tags: ${chapter.tags}

EXISTING GLOBAL BIBLE:
${existingBible}`;

  const { biblePatchModel } = await getAiConfig();
  const result = await generateText(prompt, biblePatchModel);
  // Fall back to original if Gemini failed
  return result || existingBible;
}
