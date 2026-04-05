import { loadChapter } from "./actions";
import { getFile } from "@/lib/github-content";
import { EditorClient } from "@/components/editor/editor-client";
import { ChapterSidebar } from "@/components/editor/chapter-sidebar";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

interface Props {
  params: Promise<{ novelId: string; chapterSlug: string }>;
}

export default async function EditorPage({ params }: Props) {
  const { novelId, chapterSlug } = await params;

  const [{ content }, metaFile] = await Promise.all([
    loadChapter(novelId, chapterSlug),
    getFile(`content/${novelId}/meta.json`),
  ]);

  const meta = JSON.parse(metaFile.content);
  const chapterOrder: string[] = meta.chapterOrder ?? [];
  const fetchedAt = new Date().toISOString();

  return (
    <div className="flex flex-col h-full">
      {/* Editor top bar */}
      <div className="h-[var(--nav-height)] flex items-center px-4 gap-3 border-b border-[var(--border-default)] bg-[var(--bg-elevated)] shrink-0">
        <Link href="/library" aria-label="Back to library">
          <ArrowLeft size={18} />
        </Link>
        <span className="font-serif text-sm text-[var(--text-muted)]">
          {meta.title} / {chapterSlug.replace(/^\d+-/, "").replace(/-/g, " ")}
        </span>
      </div>

      {/* Main workspace */}
      <div className="flex flex-1 overflow-hidden">
        <ChapterSidebar
          novelId={novelId}
          chapterOrder={chapterOrder}
          activeSlug={chapterSlug}
        />
        <EditorClient
          novelId={novelId}
          chapterSlug={chapterSlug}
          initialContent={content}
          fetchedAt={fetchedAt}
        />
      </div>
    </div>
  );
}
