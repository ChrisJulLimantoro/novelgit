import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getGlobalBible } from "@/lib/manuscript-rag";
import { getFile } from "@/lib/github-content";
import { GlobalBibleEditorClient } from "@/components/novels/global-bible-editor-client";
import { copyrightLine } from "@/lib/site";

interface Props {
  params: Promise<{ novelId: string }>;
}

export default async function GlobalBibleEditorPage({ params }: Props) {
  const { novelId } = await params;

  const [bible, metaFile] = await Promise.all([
    getGlobalBible(novelId).catch(() => ""),
    getFile(`content/${novelId}/meta.json`).catch(() => ({ content: "{}" })),
  ]);

  let novelTitle = novelId;
  try {
    const meta = JSON.parse(metaFile.content) as { title?: string };
    if (meta.title) novelTitle = meta.title;
  } catch { /* keep default */ }

  return (
    <div className="flex flex-col h-full">
      {/* Top bar — mirrors chapter editor */}
      <div className="h-[var(--nav-height)] flex items-center px-4 gap-3 border-b border-[var(--border-default)] bg-[var(--bg-elevated)] shrink-0">
        <Link
          href={`/library/${novelId}`}
          aria-label="Back to novel"
          className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors shrink-0"
        >
          <ArrowLeft size={18} />
        </Link>
        <span className="font-serif text-sm text-[var(--text-muted)] truncate min-w-0 capitalize">
          {novelTitle}
          <span className="mx-1.5 opacity-40">/</span>
          Global Bible
        </span>
        <span className="ml-auto shrink-0 font-mono text-[10px] text-[var(--text-muted)] hidden sm:inline">
          {copyrightLine()}
        </span>
      </div>

      {/* Editor — full height split pane */}
      <GlobalBibleEditorClient novelId={novelId} initialBible={bible} />
    </div>
  );
}
