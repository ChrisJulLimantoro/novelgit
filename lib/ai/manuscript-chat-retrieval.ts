import { cosineSimilarity } from "@/lib/ai/rag";
import type { ManuscriptRagRecord } from "@/types/manuscript-rag";
import { getManuscriptEmbShard } from "../manuscript-rag";
import { getGroq, GROQ_MODEL } from "./client";
import { embedTextMs } from "./embeddings-openrouter";
import { extractQueryKeywords } from "./rag-utils";

export const MANUSCRIPT_CHAT_K = 6;

/**
 * HyDE: generate a short hypothetical prose passage that would answer the
 * query, then embed that instead of the raw query text. Closes the intent gap
 * between plot-summary language ("when kiyotaka confess") and first-person
 * prose ("I love you").
 */
async function hydeExpand(userMessage: string): Promise<string> {
  const groq = getGroq();
  const res = await groq.chat.completions.create({
    model: GROQ_MODEL,
    max_tokens: 80,
    stream: false,
    messages: [
      {
        role: "system",
        content:
          "You are a creative writing assistant. Generate a 1-2 sentence prose excerpt from a novel that would directly answer the user's question. Output only the prose, no explanation.",
      },
      { role: "user", content: userMessage },
    ],
  });
  return res.choices[0]?.message?.content?.trim() ?? userMessage;
}

export async function buildManuscriptContextForChat(
  novelId: string,
  entries: ManuscriptRagRecord[],
  userMessage: string,
  k: number,
): Promise<string> {
  if (entries.length === 0) return "";

  const terms = extractQueryKeywords(userMessage);

  // 1. Keyword pre-filter: narrow to chapters likely relevant.
  //    For small novels (≤10 chapters) search everything.
  const allSlugs = [...new Set(entries.map((e) => e.chapterSlug))];
  let candidateSlugs: string[];

  if (allSlugs.length <= 10) {
    candidateSlugs = allSlugs;
  } else {
    const matched = new Set<string>();
    for (const e of entries) {
      const lowText = e.text.toLowerCase();
      if (terms.some((t) => lowText.includes(t))) matched.add(e.chapterSlug);
    }
    candidateSlugs = matched.size > 0 ? [...matched] : allSlugs;
  }

  // 2. Load per-chapter embedding shards in parallel
  const shardResults = await Promise.all(
    candidateSlugs.map(async (slug) => ({
      slug,
      shards: await getManuscriptEmbShard(novelId, slug),
    })),
  );

  // Build lookup: "chapterSlug:chunkIndex" → embedding
  const embMap = new Map<string, number[]>();
  for (const { slug, shards } of shardResults) {
    for (const s of shards) {
      embMap.set(`${slug}:${s.chunkIndex}`, s.embedding);
    }
  }

  const hasEmbeddings = embMap.size > 0;

  // 3. HyDE: expand query to a hypothetical prose passage, then embed it.
  //    Falls back to keyword-only scoring if OpenRouter is unavailable.
  let queryEmbedding: number[] = [];
  if (hasEmbeddings) {
    try {
      const hypothesis = await hydeExpand(userMessage);
      queryEmbedding = await embedTextMs(hypothesis);
    } catch {
      // HyDE/embedding unavailable — keyword scoring will still work
    }
  }

  // 4. Hybrid scoring on candidate entries
  const candidateEntries = entries.filter((e) => candidateSlugs.includes(e.chapterSlug));

  const scored = candidateEntries.map((e) => {
    const embedding = embMap.get(`${e.chapterSlug}:${e.chunkIndex}`) ?? [];
    const embScore =
      embedding.length > 0 && queryEmbedding.length > 0
        ? cosineSimilarity(queryEmbedding, embedding)
        : 0;

    const lowText = e.text.toLowerCase();
    let kwHits = 0;
    for (const t of terms) {
      if (lowText.includes(t)) kwHits++;
    }

    // Mild VIP lane: if a proper noun (len ≥ 4) from the query appears in the
    // chunk, ensure it's never buried below 0.5 even if embeddings are weak.
    const properNounHit = terms.some((t) => t.length >= 4 && lowText.includes(t));
    const combined = properNounHit
      ? Math.max(embScore, 0.5) + kwHits * 0.1
      : embScore + kwHits * 0.05;

    return { e, combined };
  });

  // 5. Top-k
  const top = scored.sort((a, b) => b.combined - a.combined).slice(0, k);
  if (top.length === 0) return "";

  return top
    .map(({ e }) => `### ${e.chapterTitle} (${e.chapterSlug})\n${e.text}`)
    .join("\n\n---\n\n");
}
