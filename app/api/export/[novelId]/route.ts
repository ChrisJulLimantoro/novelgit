import { cookies } from "next/headers";
import { getFile } from "@/lib/github-content";
import { exportPdf } from "@/lib/export-pdf";
import { exportDocx } from "@/lib/export-docx";
import { isValidAuthCookie } from "@/lib/auth";
import { assertSafeChapterSlug, assertSafeNovelId } from "@/lib/ids";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ novelId: string }> },
) {
  const jar = await cookies();
  if (!isValidAuthCookie(jar.get("auth_token")?.value)) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { novelId } = await params;
  try {
    assertSafeNovelId(novelId);
  } catch {
    return new Response("Invalid novel id", { status: 400 });
  }

  const url = new URL(_req.url);
  const format = url.searchParams.get("format") ?? "pdf";

  let metaRaw: string;
  try {
    const f = await getFile(`content/${novelId}/meta.json`);
    metaRaw = f.content;
  } catch {
    return new Response("Not found", { status: 404 });
  }

  let meta: { title?: string; chapterOrder?: string[] };
  try {
    meta = JSON.parse(metaRaw) as { title?: string; chapterOrder?: string[] };
  } catch {
    return new Response("Invalid meta.json", { status: 500 });
  }

  const order: string[] = meta.chapterOrder ?? [];
  for (const slug of order) {
    try {
      assertSafeChapterSlug(slug);
    } catch {
      return new Response("Invalid chapter slug in meta.json", { status: 500 });
    }
  }

  const chapters = await Promise.all(
    order.map(async (slug) => {
      const { content } = await getFile(`content/${novelId}/manuscript/${slug}.md`);
      return { slug, content };
    }),
  );

  const title = meta.title ?? novelId;

  if (format === "docx") {
    const buffer = await exportDocx(title, chapters);
    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${novelId}.docx"`,
      },
    });
  }

  const buffer = await exportPdf(title, chapters);
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${novelId}.pdf"`,
    },
  });
}
