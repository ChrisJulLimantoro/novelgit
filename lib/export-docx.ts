import { Document, Packer, Paragraph, TextRun, HeadingLevel } from "docx";

export async function exportDocx(
  title: string,
  chapters: { slug: string; content: string }[],
): Promise<Buffer> {
  const children: Paragraph[] = [
    new Paragraph({ text: title, heading: HeadingLevel.TITLE }),
  ];

  for (const { slug, content } of chapters) {
    children.push(new Paragraph({
      text: slug.replace(/^\d+-/, "").replace(/-/g, " "),
      heading: HeadingLevel.HEADING_1,
    }));
    for (const line of content.split("\n").filter(Boolean)) {
      children.push(new Paragraph({ children: [new TextRun(line.replace(/^#+\s*/, ""))] }));
    }
  }

  const doc = new Document({ sections: [{ children }] });
  return Packer.toBuffer(doc);
}
