import { Document, Packer, Paragraph, TextRun, HeadingLevel } from "docx";

export async function exportDocx(
  title: string,
  chapters: { slug: string; title: string; content: string }[],
): Promise<Buffer> {
  const children: Paragraph[] = [
    new Paragraph({ text: title, heading: HeadingLevel.TITLE }),
  ];

  for (const { title: chapterTitle, content } of chapters) {
    children.push(new Paragraph({
      text: chapterTitle,
      heading: HeadingLevel.HEADING_1,
    }));
    for (const para of content.split(/\n\n+/)) {
      const text = para.replace(/^#+\s*/gm, "").trim();
      if (text) {
        children.push(new Paragraph({ children: [new TextRun(text)] }));
      } else {
        children.push(new Paragraph({}));
      }
    }
  }

  const doc = new Document({ sections: [{ children }] });
  return Packer.toBuffer(doc);
}
