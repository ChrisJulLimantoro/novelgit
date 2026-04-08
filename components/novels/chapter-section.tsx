"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, BookOpen } from "lucide-react";
import { NewChapterButton } from "@/components/novels/new-chapter-button";
import { cn } from "@/lib/utils";

function prettySlug(slug: string) {
  return slug.replace(/^\d+-/, "").replace(/-/g, " ");
}

interface Props {
  novelId:       string;
  chapters:      string[];
  chapterTitles: Record<string, string>;
}

export function ChapterSection({ novelId, chapters, chapterTitles }: Props) {
  const [open, setOpen] = useState(true);

  return (
    <div>
      {/* Header row */}
      <div className="flex items-center justify-between mb-4">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-1.5 group"
        >
          <ChevronDown
            size={13}
            className={cn(
              "text-[var(--text-muted)] transition-transform duration-200",
              !open && "-rotate-90",
            )}
          />
          <span className="font-sans text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition-colors">
            Chapters {chapters.length > 0 && `· ${chapters.length}`}
          </span>
        </button>

        <NewChapterButton novelId={novelId} />
      </div>

      {/* Collapsible body */}
      {open && (
        chapters.length === 0 ? (
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
              const displayTitle = chapterTitles[slug] ?? prettySlug(slug);
              return (
                <li key={slug}>
                  <Link
                    href={`/edit/${novelId}/${slug}`}
                    className="flex items-center gap-4 px-4 py-3 rounded-lg hover:bg-[var(--bg-sidebar)] transition-colors group"
                  >
                    <span className="font-mono text-xs text-[var(--text-muted)] w-6 shrink-0 select-none">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="font-serif text-base text-[var(--text-primary)] capitalize flex-1 truncate">
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
        )
      )}
    </div>
  );
}
