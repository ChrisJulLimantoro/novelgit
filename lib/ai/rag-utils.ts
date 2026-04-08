/**
 * Shared keyword-extraction utilities for RAG retrieval.
 * Used by both lore-chat-retrieval and manuscript-chat-retrieval.
 */

export const STOPWORDS = new Set([
  "the", "and", "for", "are", "but", "not", "you", "all", "can", "her", "was", "one", "our", "out", "day", "get", "has", "him", "his", "how", "its", "may", "new", "now", "old", "see", "two", "way", "she", "use", "man", "any", "did", "what", "when", "where", "which", "with", "have", "from", "that", "this", "they", "them", "than", "then", "here", "just", "into", "your", "about", "after", "before", "could", "would", "should", "there", "these", "those", "some", "very", "much", "more", "most", "only", "such", "same", "both", "each", "few", "being", "over", "again", "think", "know", "need", "want", "make", "like", "well", "back", "even", "still", "been", "chapter", "scene", "tell", "tells", "told", "ask", "asks", "mentioned", "find", "look", "looking", "specific", "information", "novel", "story", "please", "help", "directly", "provided", "excerpts", "notes", "who", "whom", "whose",
]);

export function extractQueryKeywords(message: string): string[] {
  const raw = message.toLowerCase().match(/[a-z0-9']+/g) ?? [];
  return [...new Set(raw.filter((w) => w.length >= 3 && !STOPWORDS.has(w)))];
}
