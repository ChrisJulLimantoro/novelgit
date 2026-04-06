import { loadChapter } from "./actions";
import { getFile } from "@/lib/github-content";
import { EditorShell } from "@/components/editor/editor-shell";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { copyrightLine } from "@/lib/site";

interface Props {
  params: Promise<{ novelId: string; chapterSlug: string }>;
}

export default async function EditorPage({ params }: Props) {
  const { novelId, chapterSlug } = await params;

  const [{ content }, metaFile] = await Promise.all([
    loadChapter(novelId, chapterSlug),
    getFile(`content/${novelId}/meta.json`),
  ]);

  const meta           = JSON.parse(metaFile.content);
  const chapterOrder: string[]               = meta.chapterOrder  ?? [];
  const chapterTitles: Record<string, string> = meta.chapterTitles ?? {};
  const fetchedAt      = new Date().toISOString();

  // Display title: stored title > slug-derived
  const chapterDisplay =
    chapterTitles[chapterSlug] ??
    chapterSlug.replace(/^\d+-/, "").replace(/-/g, " ");

  return (
    <div className="flex flex-col h-full">
      {/* Top bar */}
      <div className="h-[var(--nav-height)] flex items-center px-4 gap-3 border-b border-[var(--border-default)] bg-[var(--bg-elevated)] shrink-0">
        <Link
          href={`/library/${novelId}`}
          aria-label="Back to novel"
          className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors shrink-0"
        >
          <ArrowLeft size={18} />
        </Link>
        <span className="font-serif text-sm text-[var(--text-muted)] truncate min-w-0 capitalize">
          {meta.title}
          <span className="mx-1.5 opacity-40">/</span>
          {chapterDisplay}
        </span>
        <span className="ml-auto shrink-0 font-mono text-[10px] text-[var(--text-muted)] hidden sm:inline">
          {copyrightLine()}
        </span>
      </div>

      {/* Workspace: sidebar + editor managed by shell */}
      <EditorShell
        novelId={novelId}
        chapterSlug={chapterSlug}
        initialContent={content}
        fetchedAt={fetchedAt}
        chapterOrder={chapterOrder}
        chapterTitles={chapterTitles}
      />
    </div>
  );
}
