import { cosineSimilarity } from "@/lib/ai/rag";
import type { ManuscriptRagRecord } from "@/types/manuscript-rag";
import { chunkManuscriptMarkdown } from "../manuscript-rag";
import { getFile } from "@/lib/github-content";
import { assertSafeChapterSlug, assertSafeNovelId } from "../ids";

/** Wider pool to ensure we catch all mentions across 27+ chapters */
const SEMANTIC_POOL = 250; 
export const MANUSCRIPT_CHAT_K = 6; 

const STOPWORDS = new Set([
  "the", "and", "for", "are", "but", "not", "you", "all", "can", "her", "was", "one", "our", "out", "day", "get", "has", "him", "his", "how", "its", "may", "new", "now", "old", "see", "two", "way", "she", "use", "man", "any", "did", "what", "when", "where", "which", "with", "have", "from", "that", "this", "they", "them", "than", "then", "here", "just", "into", "your", "about", "after", "before", "could", "would", "should", "there", "these", "those", "some", "very", "much", "more", "most", "only", "such", "same", "both", "each", "few", "being", "over", "again", "think", "know", "need", "want", "make", "like", "well", "back", "even", "still", "been", "chapter", "scene", "tell", "tells", "told", "ask", "asks", "mentioned", "find", "look", "looking", "specific", "information", "novel", "story", "please", "help", "directly", "provided", "excerpts", "notes", "who", "whom", "whose",
]);

async function loadChapter(
  novelId: string,
  chapterSlug: string,
  cache: Map<string, string>,
): Promise<string | null> {
  assertSafeNovelId(novelId);
  try { assertSafeChapterSlug(chapterSlug); }
  catch { return null; }
  let full = cache.get(chapterSlug);
  if (full === undefined) {
    try {
      const { content } = await getFile(`content/${novelId}/manuscript/${chapterSlug}.md`);
      cache.set(chapterSlug, content);
      full = content;
    } catch {
      cache.set(chapterSlug, "");
      return null;
    }
  }
  if (full === "") return null;
  return full ?? null;
}

export function extractQueryKeywords(message: string): string[] {
  const raw = message.toLowerCase().match(/[a-z0-9']+/g) ?? [];
  return [...new Set(raw.filter(w => w.length >= 3 && !STOPWORDS.has(w)))];
}

// export async function buildManuscriptContextForChat(
//   novelId:      string,
//   entries:      ManuscriptRagRecord[],
//   queryMs:      number[],
//   userMessage:  string,
//   k:            number
// ): Promise<string> {
//   if (entries.length === 0 || queryMs.length === 0) return "";

//   const terms = extractQueryKeywords(userMessage);
//   const cache = new Map<string, string>();

//   // 1. We have to take a MASSIVE pool because the "Blind" 
//   // vector search is unreliable for names.
//   const scored = entries
//     .map(e => ({ e, score: cosineSimilarity(queryMs, e.embedding) }))
//     .sort((a, b) => b.score - a.score)
//     .slice(0, 300); // Net must be wide!

//   const rows: { e: ManuscriptRagRecord, combined: number, body: string }[] = [];

//   // 2. We MUST fetch the text for all 300 candidates to find the name
//   for (const { e, score } of scored) {
//     const full = await loadChapter(novelId, e.chapterSlug, cache);
//     if (!full) continue;
    
//     const chunks = chunkManuscriptMarkdown(full);
//     const body = chunks[e.chunkIndex];
//     if (!body) continue;

//     const lowBody = body.toLowerCase();
//     let hasName = false;
//     for (const t of terms) {
//       if (lowBody.includes(t)) {
//         hasName = true;
//         break;
//       }
//     }

//     // Now the rescue actually works because 'body' exists!
//     const combined = hasName ? 1.0 + score : score;
//     rows.push({ e, combined, body });
//   }

//   // 3. Final sort
//   return rows
//     .sort((a, b) => b.combined - a.combined)
//     .slice(0, k)
//     .map(r => `### ${r.e.chapterTitle}\n${r.body}`)
//     .join("\n\n---\n\n");
// }

export async function buildManuscriptContextForChat(
  novelId:      string,
  entries:      ManuscriptRagRecord[],
  queryMs:      number[],
  userMessage:  string,
  k:            number
): Promise<string> {
  if (entries.length === 0 || queryMs.length === 0) return "";

  const terms = extractQueryKeywords(userMessage);
  const properNouns = terms.filter(t => t.length >= 4); // Focus on names like Arisu

  // 1. SCORING & ANCHORING
  const scored = entries.map((e) => {
    const embScore = cosineSimilarity(queryMs, e.embedding);
    const lowText = (e.text || "").toLowerCase();
    
    let kwHits = 0;
    let containsProperNoun = false;
    for (const t of properNouns) {
      if (lowText.includes(t)) {
        kwHits++;
        containsProperNoun = true;
      }
    }

    /**
     * THE VIP LANE:
     * If "Arisu" is in the text, we give it a 1.0 floor score.
     * This ensures it is ALWAYS in the top results, even if 
     * the embedding model thinks it's irrelevant.
     */
    const combined = containsProperNoun 
      ? 1.0 + (kwHits * 0.1) 
      : embScore + (kwHits * 0.05);

    return { e, combined };
  });

  // 2. NO POOL SLICING
  // Since we have the text in-memory, we can sort the ENTIRE index.
  // We no longer slice(0, 250) because that's what was killing "Arisu".
  const top = scored
    .sort((a, b) => b.combined - a.combined)
    .slice(0, k);

  if (top.length === 0) return "";

  return top
    .map(({ e }) => `### ${e.chapterTitle} (${e.chapterSlug})\n${e.text}`)
    .join("\n\n---\n\n");
}