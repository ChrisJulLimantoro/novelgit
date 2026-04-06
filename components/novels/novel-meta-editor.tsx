"use client";

import { useState, useTransition } from "react";
import { Pencil, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { updateNovel } from "@/app/(main)/library/actions";
import { GENRES, type Genre } from "@/types/novel";
import type { Novel } from "@/types/novel";

const statusOptions: { value: Novel["status"]; label: string }[] = [
  { value: "planning", label: "Planning" },
  { value: "writing",  label: "Writing"  },
  { value: "editing",  label: "Editing"  },
  { value: "complete", label: "Complete" },
];

interface Props {
  novelId: string;
  title:   string;
  status:  Novel["status"];
  genres:  string[];
}

export function NovelMetaEditor({ novelId, title, status, genres }: Props) {
  const [editing, setEditing]             = useState(false);
  const [draftTitle, setDraftTitle]       = useState(title);
  const [draftStatus, setDraftStatus]     = useState<Novel["status"]>(status);
  const [draftGenres, setDraftGenres]     = useState<Genre[]>(genres as Genre[]);
  const [isPending, startTransition]      = useTransition();

  function toggleGenre(g: Genre) {
    setDraftGenres((prev) =>
      prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g],
    );
  }

  function handleSave() {
    startTransition(async () => {
      await updateNovel(novelId, { title: draftTitle.trim() || title, status: draftStatus, genres: draftGenres });
      setEditing(false);
    });
  }

  function handleCancel() {
    setDraftTitle(title);
    setDraftStatus(status);
    setDraftGenres(genres as Genre[]);
    setEditing(false);
  }

  if (!editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        className="inline-flex items-center gap-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
      >
        <Pencil size={12} />
        Edit metadata
      </button>
    );
  }

  return (
    <div className="border border-[var(--border-default)] rounded-xl p-5 flex flex-col gap-5 bg-[var(--bg-elevated)]">
      {/* Title */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Title</label>
        <input
          value={draftTitle}
          onChange={(e) => setDraftTitle(e.target.value)}
          className="w-full px-3 py-2 rounded-lg border border-[var(--border-default)] bg-[var(--bg-base)] text-[var(--text-primary)] text-sm focus:outline-none focus:border-[var(--accent)] transition-colors font-serif"
        />
      </div>

      {/* Status */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Status</label>
        <div className="flex flex-wrap gap-2">
          {statusOptions.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setDraftStatus(opt.value)}
              className={cn(
                "px-3 py-1 rounded-full text-xs border transition-all duration-150",
                draftStatus === opt.value
                  ? "bg-[var(--accent)]/10 border-[var(--accent)] text-[var(--accent)] font-medium"
                  : "border-[var(--border-default)] text-[var(--text-muted)] hover:border-[var(--accent)]/50",
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Genres */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
          Genres <span className="normal-case font-normal">(pick any)</span>
        </label>
        <div className="flex flex-wrap gap-2">
          {GENRES.map((g) => {
            const active = draftGenres.includes(g);
            return (
              <button
                key={g}
                type="button"
                onClick={() => toggleGenre(g)}
                aria-pressed={active}
                className={cn(
                  "px-3 py-1 rounded-full text-xs border transition-all duration-150 select-none",
                  active
                    ? "bg-[var(--accent)]/10 border-[var(--accent)] text-[var(--accent)] font-medium"
                    : "border-[var(--border-default)] text-[var(--text-muted)] hover:border-[var(--accent)]/50 hover:text-[var(--text-primary)]",
                )}
              >
                {g}
              </button>
            );
          })}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-1">
        <button
          onClick={handleSave}
          disabled={isPending}
          className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-[var(--accent)] text-white text-sm hover:bg-[var(--accent-hover)] disabled:opacity-50 transition-colors"
        >
          <Check size={13} />
          {isPending ? "Saving…" : "Save"}
        </button>
        <button
          onClick={handleCancel}
          disabled={isPending}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--border-default)] text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
        >
          <X size={13} />
          Cancel
        </button>
      </div>
    </div>
  );
}
