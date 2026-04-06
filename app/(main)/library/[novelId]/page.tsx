import Link from "next/link";
import { notFound } from "next/navigation";
import { getFile } from "@/lib/github-content";
import { getLibrary } from "@/app/(main)/library/actions";
import { StatusBadge } from "@/components/novels/status-badge";
import { NewChapterButton } from "@/components/novels/new-chapter-button";
import { NovelMetaEditor } from "@/components/novels/novel-meta-editor";
import { Separator } from "@/components/ui/separator";
import { BookOpen, ArrowLeft } from "lucide-react";

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

  return (
    <div className="max-w-[800px] mx-auto px-6 py-10">
      {/* Back */}
      <Link
        href="/library"
        className="inline-flex items-center gap-1.5 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors mb-8"
      >
        <ArrowLeft size={14} />
        Library
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-3">
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

      {/* Inline metadata editor */}
      <div className="mb-8">
        <NovelMetaEditor
          novelId={novelId}
          title={novel.title}
          status={novel.status}
          genres={meta.genres}
        />
      </div>

      <Separator className="mb-8" />

      {/* Chapter list header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-sans text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
          Chapters {chapters.length > 0 && `· ${chapters.length}`}
        </h2>
        <NewChapterButton novelId={novelId} />
      </div>

      {chapters.length === 0 ? (
        <div className="flex flex-col items-center gap-5 py-16 text-center">
          <BookOpen size={40} className="text-[var(--text-muted)] opacity-30" />
          <div>
            <p className="font-serif text-xl text-[var(--text-primary)] mb-1">No chapters yet.</p>
            <p className="text-sm text-[var(--text-muted)]">Create your first chapter to start writing.</p>
          </div>
          <NewChapterButton novelId={novelId} />
        </div>
      ) : (
        <ol className="flex flex-col gap-1">
          {chapters.map((slug, i) => {
            const displayTitle = meta.chapterTitles?.[slug] ?? prettySlug(slug);
            return (
              <li key={slug}>
                <Link
                  href={`/edit/${novelId}/${slug}`}
                  className="flex items-center gap-4 px-4 py-3 rounded-lg hover:bg-[var(--bg-sidebar)] transition-colors group"
                >
                  <span className="font-mono text-xs text-[var(--text-muted)] w-6 shrink-0 select-none">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="font-serif text-base text-[var(--text-primary)] capitalize flex-1">
                    {displayTitle}
                  </span>
                  <span className="text-xs text-[var(--text-muted)] opacity-0 group-hover:opacity-100 transition-opacity">
                    Edit →
                  </span>
                </Link>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
