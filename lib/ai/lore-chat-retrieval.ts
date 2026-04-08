/**
 * Lore RAG for chat: score every entry (small N) with embedding + keywords +
 * explicit "who is X / about X" hints so name queries are not lost in top-5 only.
 */
import { cosineSimilarity } from "@/lib/ai/rag";
import { getLoreEntry } from "@/lib/lore";
import { extractQueryKeywords } from "@/lib/ai/rag-utils";
import type { LoreEntry, LoreIndex } from "@/types/lore";

export const LORE_CHAT_K = 10;

/** Pull likely entity names from common question shapes. */
export function extractEntityHints(message: string): string[] {
  const hints = new Set<string>();
  const q = message.trim();

  const patterns: RegExp[] = [
    /\bwho\s+is\s+([^?.!,]+)/i,
    /\bwhat\s+(?:is|was)\s+([^?.!,]+)/i,
    /\bwhat\s+do\s+we\s+know\s+about\s+([^?.!,]+)/i,
    /\btell\s+me\s+about\s+([^?.!,]+)/i,
    /\babout\s+([^?.!,]+)\??$/i,
  ];

  for (const re of patterns) {
    const m = q.match(re);
    if (m?.[1]) {
      const raw = m[1].trim().replace(/^the\s+/i, "");
      if (raw.length >= 2) hints.add(raw.toLowerCase());
    }
  }

  return [...hints];
}

function keywordHits(textLower: string, terms: string[]): number {
  if (terms.length === 0) return 0;
  let n = 0;
  for (const t of terms) {
    if (textLower.includes(t)) n += 1;
  }
  return n;
}

/**
 * Build lore markdown sections for the system prompt.
 *
 * Scoring runs entirely from the index (name, tags, snippet, embedding) —
 * no GitHub reads. Full entry bodies are only fetched for the top-K results
 * that actually appear in the prompt.
 */
export async function buildLoreContextForChat(
  novelId:     string,
  loreIndex:   LoreIndex,
  queryLore:   number[],
  userMessage: string,
  k:           number,
): Promise<string> {
  const records = loreIndex.entries;
  if (records.length === 0) return "";

  const terms = extractQueryKeywords(userMessage);
  const hints = extractEntityHints(userMessage);

  // Score every record from the index — no I/O
  const scored = records.map((r) => {
    const nameLow     = r.name.toLowerCase();
    const tagsLow     = r.tags.map((t) => t.toLowerCase()).join(" ");
    const snippetLow  = (r.snippet ?? "").toLowerCase();
    const blob        = `${nameLow} ${tagsLow} ${snippetLow}`;

    let score = 0;
    if (queryLore.length > 0 && r.embedding.length > 0) {
      score += cosineSimilarity(queryLore, r.embedding);
    }

    score += keywordHits(blob, terms) * 0.12;

    for (const h of hints) {
      if (h.length < 2) continue;
      if (nameLow.includes(h) || h.includes(nameLow)) {
        score += 4;
      } else if (tagsLow.includes(h)) {
        score += 2.5;
      } else if (snippetLow.includes(h)) {
        score += 1.2;
      } else if (h.length >= 4) {
        const p = h.slice(0, 4);
        for (const w of nameLow.split(/\s+/)) {
          if (w.length >= 4 && (w.startsWith(p) || h.startsWith(w.slice(0, 4)))) {
            score += 2.2;
            break;
          }
        }
      }
    }

    return { r, score };
  });

  scored.sort((a, b) => b.score - a.score);
  const topK = scored.slice(0, k);

  // Only fetch full bodies for the entries that will appear in the prompt
  const withBodies = await Promise.all(
    topK.map(async ({ r, score }) => {
      try {
        const entry = await getLoreEntry(novelId, r.id);
        return { entry, score };
      } catch {
        return null;
      }
    }),
  );

  const results = withBodies.filter(Boolean) as { entry: LoreEntry; score: number }[];
  if (results.length === 0) return "";

  return results
    .map(({ entry }) => `### ${entry.name} (${entry.type})\n${entry.body}`)
    .join("\n\n---\n\n");
}
