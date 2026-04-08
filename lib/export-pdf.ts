import { Document, Page, Text, View, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import React from "react";

const styles = StyleSheet.create({
  page:         { padding: 60, fontFamily: "Times-Roman" },
  title:        { fontSize: 24, marginBottom: 24, textAlign: "center" },
  chapterTitle: { fontSize: 16, marginBottom: 12, marginTop: 24 },
  body:         { fontSize: 12, lineHeight: 1.8 },
});

export async function exportPdf(
  title: string,
  chapters: { slug: string; title: string; content: string }[],
): Promise<Buffer> {
  const doc = React.createElement(
    Document,
    null,
    React.createElement(
      Page,
      { size: "A4", style: styles.page },
      React.createElement(Text, { style: styles.title }, title),
    ),
    ...chapters.map(({ slug, title: chapterTitle, content }) =>
      React.createElement(
        Page,
        { key: slug, size: "A4", style: styles.page },
        React.createElement(Text, { style: styles.chapterTitle }, chapterTitle),
        React.createElement(Text, { style: styles.body }, content.replace(/^#+\s*/gm, "")),
      ),
    ),
  );
  return renderToBuffer(doc);
}
