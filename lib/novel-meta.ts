import { getFile } from "./github-content";
import { assertSafeNovelId } from "./ids";

export async function loadNovelChapterPlan(novelId: string): Promise<{
  chapterOrder:  string[];
  chapterTitles: Record<string, string>;
}> {
  assertSafeNovelId(novelId);
  const { content } = await getFile(`content/${novelId}/meta.json`);
  let o: unknown;
  try {
    o = JSON.parse(content);
  } catch {
    throw new Error("meta.json: invalid JSON");
  }
  if (!o || typeof o !== "object" || Array.isArray(o)) {
    return { chapterOrder: [], chapterTitles: {} };
  }
  const raw = o as { chapterOrder?: unknown; chapterTitles?: unknown };
  const chapterOrder = Array.isArray(raw.chapterOrder)
    ? raw.chapterOrder.filter((x): x is string => typeof x === "string")
    : [];
  const chapterTitles =
    raw.chapterTitles &&
    typeof raw.chapterTitles === "object" &&
    !Array.isArray(raw.chapterTitles)
      ? (raw.chapterTitles as Record<string, string>)
      : {};
  return { chapterOrder, chapterTitles };
}
