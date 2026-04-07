/**
 * Lore RAG reindex: embeds lore index entries via Voyage (see lib/ai/embeddings.ts).
 */
import { cookies } from "next/headers";
import { isValidAuthCookie } from "@/lib/auth";
import { assertSafeNovelId } from "@/lib/ids";
import { getLoreIndex, getLoreEntry, updateLoreIndex } from "@/lib/lore";
import { embedBatch } from "@/lib/ai/embeddings";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ novelId: string }> },
) {
  const jar = await cookies();
  if (!isValidAuthCookie(jar.get("auth_token")?.value)) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { novelId } = await params;
  try { assertSafeNovelId(novelId); }
  catch { return new Response("Invalid novel id", { status: 400 }); }

  const today = new Date().toISOString().slice(0, 10);

  let reindexed = 0;
  const loreIndex = await getLoreIndex(novelId);
  if (loreIndex.entries.length > 0) {
    const entries = await Promise.all(
      loreIndex.entries.map((rec) => getLoreEntry(novelId, rec.id)),
    );

    const texts      = entries.map((e) => `${e.type} ${e.name}: ${e.body.slice(0, 500)}`);
    const embeddings = await embedBatch(texts);

    loreIndex.entries = loreIndex.entries.map((rec, i) => ({
      ...rec,
      embedding: embeddings[i] ?? [],
      updatedAt: today,
    }));

    await updateLoreIndex(novelId, loreIndex);
    reindexed = entries.length;
  }

  return Response.json({
    reindexed,
    manuscriptChunks: 0,
  });
}
