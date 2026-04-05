"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface Props {
  content: string;
}

export function ReaderPane({ content }: Props) {
  return (
    <div className="flex-1 overflow-y-auto">
      <article className="prose prose-lg max-w-[var(--editor-max-width)] mx-auto py-20 px-4 font-serif leading-[var(--leading-prose)]">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
      </article>
    </div>
  );
}
