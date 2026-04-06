"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

type SyncState = "idle" | "syncing" | "success" | "error";

interface Props {
  novelId:       string;
  chapterSlug:   string;
  chapterOrder:  string[];
  syncState:     SyncState;
}

export function ChapterReadNav({
  novelId, chapterSlug, chapterOrder, syncState,
}: Props) {
  const idx = chapterOrder.indexOf(chapterSlug);
  const prevSlug = idx > 0 ? chapterOrder[idx - 1] : null;
  const nextSlug =
    idx >= 0 && idx < chapterOrder.length - 1 ? chapterOrder[idx + 1] : null;

  const showIndex = idx >= 0 && chapterOrder.length > 0;

  const syncBannerActive = syncState !== "idle";

  return (
    <nav
      aria-label="Chapter navigation"
      className={cn(
        "fixed left-1/2 -translate-x-1/2 z-20",
        "max-w-[calc(100vw-1.5rem)] w-auto",
        "flex items-center justify-center gap-1 sm:gap-2",
        "rounded-full border border-[var(--border-default)] backdrop-blur-md",
        "bg-[var(--bg-elevated)]/95 shadow-lg px-2 py-1.5 sm:px-3 sm:py-2",
        syncBannerActive
          ? "bottom-[max(3.25rem,calc(env(safe-area-inset-bottom,0px)+3rem))]"
          : "bottom-[max(0.75rem,calc(env(safe-area-inset-bottom,0px)+0.5rem))]",
      )}
    >
      <ChapterNavButton
        href={prevSlug ? `/edit/${novelId}/${prevSlug}` : undefined}
        disabled={!prevSlug}
        ariaLabel="Previous chapter"
        icon={<ChevronLeft className="size-5 shrink-0" aria-hidden />}
      />

      {showIndex && (
        <span
          className="hidden sm:inline font-mono text-xs text-[var(--text-muted)] tabular-nums px-1 select-none min-w-[4.5rem] text-center"
          aria-live="polite"
        >
          {idx + 1} / {chapterOrder.length}
        </span>
      )}

      <ChapterNavButton
        href={nextSlug ? `/edit/${novelId}/${nextSlug}` : undefined}
        disabled={!nextSlug}
        ariaLabel="Next chapter"
        icon={<ChevronRight className="size-5 shrink-0" aria-hidden />}
      />
    </nav>
  );
}

function ChapterNavButton({
  href,
  disabled,
  ariaLabel,
  icon,
}: {
  href: string | undefined;
  disabled: boolean;
  ariaLabel: string;
  icon: ReactNode;
}) {
  const className = cn(
    "inline-flex items-center justify-center min-h-11 min-w-11 rounded-full",
    "text-[var(--text-primary)] transition-colors",
    disabled
      ? "opacity-35 pointer-events-none cursor-not-allowed"
      : "hover:bg-[var(--bg-sidebar)] active:bg-[var(--border-default)]",
  );

  if (disabled || !href) {
    return (
      <span
        role="button"
        aria-disabled="true"
        aria-label={ariaLabel}
        className={className}
      >
        {icon}
      </span>
    );
  }

  return (
    <Link
      href={href}
      aria-label={ariaLabel}
      className={className}
      scroll
    >
      {icon}
    </Link>
  );
}
