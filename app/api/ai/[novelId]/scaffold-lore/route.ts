import { cookies } from "next/headers";
import { isValidAuthCookie } from "@/lib/auth";
import { assertSafeNovelId } from "@/lib/ids";
import { getGroq, GROQ_MODEL } from "@/lib/ai/client";
import { LORE_TYPES } from "@/types/lore";
import type { LoreType } from "@/types/lore";

const SECTION_MAP: Record<LoreType, string[]> = {
  character: ["## Description", "## Appearance", "## Personality", "## History", "## Relationships", "## Notes"],
  location:  ["## Description", "## Geography", "## History", "## Notable Features", "## Inhabitants", "## Notes"],
  faction:   ["## Overview", "## Goals", "## Structure", "## History", "## Key Members", "## Notes"],
  event:     ["## Summary", "## Causes", "## Key Participants", "## Consequences", "## Timeline", "## Notes"],
  item:      ["## Description", "## Origin", "## Properties", "## History", "## Current Location", "## Notes"],
};

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

  let body: { name?: string; type?: string; tags?: string[] };
  try { body = (await req.json()) as { name?: string; type?: string; tags?: string[] }; }
  catch { return new Response("Invalid JSON", { status: 400 }); }

  const { name, type, tags = [] } = body;
  if (!name || !type || !LORE_TYPES.includes(type as LoreType)) {
    return new Response("Missing or invalid name/type", { status: 400 });
  }

  const loreType  = type as LoreType;
  const sections  = SECTION_MAP[loreType].join("\n\n");
  const tagsLabel = tags.length > 0 ? tags.join(", ") : "none";

  const systemPrompt = `You are a creative writing assistant helping scaffold a ${loreType} lore entry for a novel.
Generate a structured markdown template using ONLY the following section headings — no YAML frontmatter, just the body:

${sections}

Rules:
- Under each heading, write a single line: "[Describe here]" as a placeholder
- Do not invent specific facts not provided by the user
- Keep the structure clean and ready for the author to fill in
- Respond with raw markdown only — no code fences, no preamble`;

  const userPrompt = `Name: ${name}\nTags: ${tagsLabel}`;

  const message = await getGroq().chat.completions.create({
    model:      GROQ_MODEL,
    max_tokens: 1024,
    messages: [
      { role: "system",  content: systemPrompt },
      { role: "user",    content: userPrompt   },
    ],
  });

  const markdown = message.choices[0]?.message?.content ?? "";
  return Response.json({ markdown });
}
