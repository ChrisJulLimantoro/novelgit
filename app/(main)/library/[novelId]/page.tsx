import Link from "next/link";
import { notFound } from "next/navigation";
import { getFile } from "@/lib/github-content";
import { getLibrary } from "@/app/(main)/library/actions";
import { getLoreIndex } from "@/lib/lore";
import { StatusBadge } from "@/components/novels/status-badge";
import { NovelMetaEditor } from "@/components/novels/novel-meta-editor";
import { ExportButton } from "@/components/novels/export-button";
import { ChapterSection } from "@/components/novels/chapter-section";
import { LoreSection } from "@/components/novels/lore-section";
import { GlobalBibleSection } from "@/components/novels/global-bible-section";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft } from "lucide-react";
import { getGlobalBible } from "@/lib/manuscript-rag";

interface Meta {
  id:             string;
  title:          string;
  genres:         string[];
  chapterOrder:   string[];
  chapterTitles?: Record<string, string>;
}

function prettySlug(slug: string) {
  return slug.replace(/^\d+-/, "").replace(/-/g, " ");
}

export default async function NovelPage({
  params,
}: {
  params: Promise<{ novelId: string }>;
}) {
  const { novelId } = await params;

  const library = await getLibrary();
  const novel = library.novels.find((n) => n.id === novelId);
  if (!novel) notFound();

  let meta: Meta = { id: novelId, title: novel.title, genres: novel.genres ?? [], chapterOrder: [] };
  try {
    const { content } = await getFile(`content/${novelId}/meta.json`);
    const parsed = JSON.parse(content);
    meta = { ...meta, ...parsed, genres: parsed.genres ?? novel.genres ?? [] };
  } catch { /* meta not yet on GitHub */ }

  const chapters = meta.chapterOrder ?? [];

  const loreIndex = await getLoreIndex(novelId);
  const lorePreview = loreIndex.entries.slice(0, 5).map(({ id, type, name }) => ({ id, type, name }));

  const globalBible = await getGlobalBible(novelId).catch(() => "");

  return (
    <div className="max-w-[800px] mx-auto px-4 sm:px-6 py-8 sm:py-10">
      {/* Back */}
      <Link
        href="/library"
        className="inline-flex items-center gap-1.5 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors mb-8"
      >
        <ArrowLeft size={14} />
        Library
      </Link>

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-4 mb-3">
        <h1 className="font-serif text-4xl font-semibold text-[var(--text-primary)] leading-tight">
          {novel.title}
        </h1>
        <StatusBadge status={novel.status} variant="filled" />
      </div>

      {/* Genre chips */}
      {meta.genres.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {meta.genres.map((g) => (
            <span
              key={g}
              className="px-2.5 py-0.5 rounded-full text-xs border border-[var(--border-default)] text-[var(--text-muted)]"
            >
              {g}
            </span>
          ))}
        </div>
      )}

      {/* Inline metadata editor + export */}
      <div className="mb-8 flex flex-wrap items-center gap-3 sm:gap-5">
        <NovelMetaEditor
          novelId={novelId}
          title={novel.title}
          status={novel.status}
          genres={meta.genres}
        />
        <ExportButton novelId={novelId} novelTitle={meta.title ?? novel.title} />
      </div>

      <Separator className="mb-8" />

      {/* Global Bible — story overview, always at top */}
      <GlobalBibleSection novelId={novelId} initialBible={globalBible} />

      <Separator className="my-8" />

      <ChapterSection
        novelId={novelId}
        chapters={chapters}
        chapterTitles={meta.chapterTitles ?? {}}
      />

      {/* Lore section */}
      <Separator className="my-8" />

      <LoreSection
        novelId={novelId}
        entries={lorePreview}
        totalCount={loreIndex.entries.length}
      />
    </div>
  );
}
