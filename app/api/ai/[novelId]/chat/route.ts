import { cookies } from "next/headers";
import { isValidAuthCookie } from "@/lib/auth";
import { assertSafeNovelId } from "@/lib/ids";
import { getGroq, GROQ_MODEL } from "@/lib/ai/client";
import { getLoreIndex } from "@/lib/lore";
import { getManuscriptRagIndex } from "@/lib/manuscript-rag";
import { getFile } from "@/lib/github-content";
import {
  buildLoreContextForChat,
  LORE_CHAT_K,
} from "@/lib/ai/lore-chat-retrieval";
import {
  buildManuscriptContextForChat,
  MANUSCRIPT_CHAT_K,
} from "@/lib/ai/manuscript-chat-retrieval";
import { ChatMessageSchema } from "@/types/lore";
import { z } from "zod";

const RequestSchema = z.object({
  messages: z.array(ChatMessageSchema).min(1).max(50),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ novelId: string }> },
) {
  const jar = await cookies();
  if (!isValidAuthCookie(jar.get("auth_token")?.value)) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { novelId } = await params;
  try { assertSafeNovelId(novelId); }
  catch { return new Response("Invalid novel id", { status: 400 }); }

  let parsed: z.infer<typeof RequestSchema>;
  try { parsed = RequestSchema.parse(await req.json()); }
  catch { return new Response("Invalid request body", { status: 400 }); }

  const { messages } = parsed;
  const lastUserMessage = [...messages].reverse().find((m) => m.role === "user");
  if (!lastUserMessage) return new Response("No user message", { status: 400 });

  // Load novel title
  let novelTitle = novelId;
  try {
    const { content } = await getFile(`content/${novelId}/meta.json`);
    const meta = JSON.parse(content) as { title?: string };
    novelTitle = meta.title ?? novelId;
  } catch { /* use novelId as fallback */ }

  // — Lore RAG context —
  let loreContext = "";
  try {
    const loreIndex = await getLoreIndex(novelId);
    const loreHasEmb =
      loreIndex.entries.length > 0 && loreIndex.entries.some((e) => e.embedding.length > 0);

    let queryLore: number[] = [];
    if (loreIndex.entries.length > 0 && loreHasEmb) {
      try {
        const { embedText } = await import("@/lib/ai/embeddings");
        queryLore = await embedText(lastUserMessage.content);
      } catch {
        queryLore = [];
      }
    }

    if (loreIndex.entries.length > 0) {
      loreContext = await buildLoreContextForChat(
        novelId,
        loreIndex,
        queryLore,
        lastUserMessage.content,
        LORE_CHAT_K,
      );
    }
  } catch { /* best-effort */ }

  // — Manuscript RAG context (HyDE + semantic retrieval) —
  let manuscriptContext = "";
  try {
    const msIndex = await getManuscriptRagIndex(novelId);
    if (msIndex.entries.length > 0) {
      manuscriptContext = await buildManuscriptContextForChat(
        novelId,
        msIndex.entries,
        lastUserMessage.content,
        MANUSCRIPT_CHAT_K,
      );
    }
  } catch { /* best-effort */ }

  // Build system prompt
  const contextSections: string[] = [];
  if (loreContext) {
    contextSections.push(`## World-building (lore)\n${loreContext}`);
  }
  if (manuscriptContext) {
    contextSections.push(`## Manuscript excerpts\n${manuscriptContext}`);
  }

  // Only instruct the LLM to cite chapter locations when the user is explicitly
  // asking where/when something happens in the manuscript. For character or
  // world-building questions the chapter citations are noise.
  const SCENE_QUERY_RE = /\b(when|which chapter|where does|where do|find the scene|what chapter|in which|at what point|in what chapter)\b/i;
  const isSceneQuery = SCENE_QUERY_RE.test(lastUserMessage.content);
  const citationInstruction = isSceneQuery
    ? "When the answer refers to a specific scene or moment in the manuscript, cite the chapter title."
    : "Draw on the provided lore and manuscript context to inform your answer. Do not mention chapter names or locations unless specifically asked.";

  const systemPrompt =
    contextSections.length > 0
      ? `You are a creative writing assistant for the novel "${novelTitle}". You have retrieved context from the author's notes below. Use them for continuity and world-building.\n\n${contextSections.join("\n\n")}\n\n${citationInstruction} If the context does not contain enough to answer, say so clearly. Answer concisely.`
      : `You are a creative writing assistant for the novel "${novelTitle}". Help the author with questions, ideas, and writing challenges.`;

  const encoder = new TextEncoder();
  const stream  = new ReadableStream({
    async start(controller) {
      try {
        const groqStream = await getGroq().chat.completions.create({
          model:      GROQ_MODEL,
          max_tokens: 1024,
          stream:     true,
          messages: [
            { role: "system", content: systemPrompt },
            ...messages.map((m) => ({ role: m.role, content: m.content })),
          ],
        });

        for await (const chunk of groqStream) {
          const text = chunk.choices[0]?.delta?.content ?? "";
          if (text) controller.enqueue(encoder.encode(text));
        }
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type":           "text/plain; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
      "Cache-Control":          "no-cache",
      "Transfer-Encoding":      "chunked",
    },
  });
}
