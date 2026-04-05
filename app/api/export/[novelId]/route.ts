import { getFile } from "@/lib/github-content";
import { exportPdf } from "@/lib/export-pdf";
import { exportDocx } from "@/lib/export-docx";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ novelId: string }> },
) {
  const { novelId } = await params;
  const url = new URL(_req.url);
  const format = url.searchParams.get("format") ?? "pdf";

  const { content: metaRaw } = await getFile(`content/${novelId}/meta.json`);
  const meta = JSON.parse(metaRaw);
  const order: string[] = meta.chapterOrder ?? [];

  const chapters = await Promise.all(
    order.map(async (slug) => {
      const { content } = await getFile(`content/${novelId}/manuscript/${slug}.md`);
      return { slug, content };
    }),
  );

  if (format === "docx") {
    const buffer = await exportDocx(meta.title, chapters);
    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${novelId}.docx"`,
      },
    });
  }

  const buffer = await exportPdf(meta.title, chapters);
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${novelId}.pdf"`,
    },
  });
}
