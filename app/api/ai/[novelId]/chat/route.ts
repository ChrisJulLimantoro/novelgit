import { cookies } from "next/headers";
import { isValidAuthCookie } from "@/lib/auth";
import { assertSafeNovelId } from "@/lib/ids";
import { getGroq, GROQ_MODEL } from "@/lib/ai/client";
import { getLoreIndex } from "@/lib/lore";
import { getFile } from "@/lib/github-content";
import {
  buildLoreContextForChat,
  LORE_CHAT_K,
} from "@/lib/ai/lore-chat-retrieval";
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
  } catch { /* best-effort — continue without RAG context */ }

  const systemPrompt =
    loreContext
      ? `You are a creative writing assistant for the novel "${novelTitle}". You have retrieved context from the author's lore notes below. Use them for world-building and continuity.\n\n## World-building (lore)\n${loreContext}\n\nIf the answer appears in the lore, cite the entry name when helpful. If the notes do not contain enough to answer, say so clearly. Run **Reindex RAG** in the editor (with \`VOYAGE_API_KEY\` set) after updating lore so embeddings stay current. Answer concisely.`
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
      "Content-Type":             "text/plain; charset=utf-8",
      "X-Content-Type-Options":   "nosniff",
      "Cache-Control":            "no-cache",
      "Transfer-Encoding":        "chunked",
    },
  });
}
