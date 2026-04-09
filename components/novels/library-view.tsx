"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { Search, X } from "lucide-react";
import { NewNovelDialog } from "@/components/novels/new-novel-dialog";
import { StatusBadge } from "@/components/novels/status-badge";
import type { Novel } from "@/types/novel";
import { cn } from "@/lib/utils";

// ── Types ────────────────────────────────────────────────────────────────────

type LayoutMode = "covers" | "catalog" | "spotlight";

// ── Cover generation ─────────────────────────────────────────────────────────

const GENRE_HUES: Record<string, number> = {
  Fantasy: 270,
  "Science Fiction": 200,
  Romance: 340,
  Mystery: 225,
  Thriller: 5,
  Horror: 350,
  "Literary Fiction": 38,
  "Historical Fiction": 28,
  "Young Adult": 30,
  Adventure: 135,
  Dystopian: 192,
  Paranormal: 282,
  Comedy: 52,
  Drama: 18,
  "Short Story": 205,
  "Non-Fiction": 210,
};

function hashCode(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function coverHue(novel: Novel): number {
  for (const g of novel.genres) {
    const h = GENRE_HUES[g];
    if (h !== undefined) return h;
  }
  return hashCode(novel.id) % 360;
}

const STOP = new Set(["the", "a", "an", "of", "in", "on", "at", "to", "for", "and", "or"]);
function initials(title: string): string {
  const words = title.split(/\s+/).filter((w) => !STOP.has(w.toLowerCase()));
  if (!words.length) return title.slice(0, 2).toUpperCase();
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return words.slice(0, 2).map((w) => w[0].toUpperCase()).join("");
}

// ── NovelCover ────────────────────────────────────────────────────────────────

interface CoverProps {
  novel: Novel;
  className?: string;
}

function NovelCover({ novel, className }: CoverProps) {
  const hue = coverHue(novel);
  const h2 = (hue + 22) % 360;
  const h3 = (hue - 12 + 360) % 360;
  return (
    <div
      className={cn("relative overflow-hidden select-none", className)}
      style={{
        background: `linear-gradient(158deg,
          hsl(${hue}, 50%, 27%) 0%,
          hsl(${h2}, 43%, 18%) 50%,
          hsl(${h3}, 55%, 12%) 100%)`,
      }}
      aria-hidden
    >
      {/* Status accent line */}
      <div
        className="absolute bottom-0 left-0 right-0 h-[2px]"
        style={{ background: `var(--status-${novel.status})`, opacity: 0.85 }}
      />
      {/* Decorative open-book silhouette */}
      <svg
        viewBox="0 0 80 56"
        className="absolute -right-2 -bottom-1 w-20 opacity-[0.065]"
        fill="white"
      >
        <path d="M40 4C34 4 18 7 6 14L6 52C18 46 34 48 40 52C46 48 62 46 74 52L74 14C62 7 46 4 40 4Z" />
        <line x1="40" y1="4" x2="40" y2="52" stroke="white" strokeWidth="2" fill="none" />
        <path d="M15 22 L34 22M15 28 L34 28M15 34 L28 34" stroke="white" strokeWidth="1.5" opacity="0.5" fill="none" />
        <path d="M46 22 L65 22M46 28 L65 28M52 34 L65 34" stroke="white" strokeWidth="1.5" opacity="0.5" fill="none" />
      </svg>
      {/* Large watermark initials */}
      <span
        className="absolute inset-0 flex items-center justify-center font-serif font-black leading-none pointer-events-none"
        style={{
          fontSize: "clamp(2.5rem, 38%, 5.5rem)",
          color: "rgba(255,255,255,0.08)",
          letterSpacing: "-0.04em",
        }}
      >
        {initials(novel.title)}
      </span>
    </div>
  );
}

// ── Filtering ─────────────────────────────────────────────────────────────────

function useFiltered(novels: Novel[], q: string) {
  return useMemo(() => {
    if (!q.trim()) return novels;
    const lq = q.toLowerCase();
    return novels.filter(
      (n) =>
        n.title.toLowerCase().includes(lq) ||
        n.genres.some((g) => g.toLowerCase().includes(lq)) ||
        n.status.toLowerCase().includes(lq),
    );
  }, [novels, q]);
}

// ── Layout A: Covers ──────────────────────────────────────────────────────────

function CoversLayout({ novels }: { novels: Novel[] }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
      {novels.map((novel) => (
        <Link
          key={novel.id}
          href={`/library/${novel.id}`}
          className="group rounded-xl overflow-hidden border border-[var(--border-default)] bg-[var(--bg-elevated)] hover:-translate-y-1 hover:shadow-[var(--shadow-lift)] transition-all duration-200"
        >
          <NovelCover novel={novel} className="aspect-[2/3] w-full" />
          <div className="p-3 space-y-2">
            <h2 className="font-serif font-semibold text-sm sm:text-base leading-snug text-[var(--text-primary)] line-clamp-2">
              {novel.title}
            </h2>
            <div className="flex items-center gap-2 flex-wrap">
              <StatusBadge status={novel.status} variant="filled" />
            </div>
            {novel.genres.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {novel.genres.slice(0, 2).map((g) => (
                  <span
                    key={g}
                    className="text-[9px] px-1.5 py-0.5 rounded-full border border-[var(--border-default)] text-[var(--text-muted)]"
                  >
                    {g}
                  </span>
                ))}
                {novel.genres.length > 2 && (
                  <span className="text-[9px] text-[var(--text-muted)] self-center">
                    +{novel.genres.length - 2}
                  </span>
                )}
              </div>
            )}
          </div>
        </Link>
      ))}
    </div>
  );
}

// ── Layout B: Catalog ─────────────────────────────────────────────────────────

function CatalogLayout({ novels }: { novels: Novel[] }) {
  return (
    <div className="flex flex-col divide-y divide-[var(--border-default)] border border-[var(--border-default)] rounded-xl overflow-hidden">
      {novels.map((novel, i) => (
        <Link
          key={novel.id}
          href={`/library/${novel.id}`}
          className="group flex items-center gap-4 px-5 py-4 bg-[var(--bg-elevated)] hover:bg-[var(--bg-sidebar)] transition-colors"
        >
          {/* Index */}
          <span className="font-mono text-xs text-[var(--text-muted)] w-5 shrink-0 text-right">
            {String(i + 1).padStart(2, "0")}
          </span>
          {/* Cover thumbnail */}
          <NovelCover novel={novel} className="w-9 h-[52px] rounded-md shrink-0" />
          {/* Body */}
          <div className="flex-1 min-w-0">
            <h2 className="font-serif font-semibold text-base leading-snug text-[var(--text-primary)] truncate group-hover:text-[var(--accent)] transition-colors">
              {novel.title}
            </h2>
            {novel.genres.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-1">
                {novel.genres.slice(0, 4).map((g) => (
                  <span
                    key={g}
                    className="text-[10px] px-2 py-0.5 rounded-full border border-[var(--border-default)] text-[var(--text-muted)]"
                  >
                    {g}
                  </span>
                ))}
              </div>
            )}
          </div>
          {/* Right side */}
          <div className="flex items-center gap-3 shrink-0">
            <StatusBadge status={novel.status} variant="filled" />
            <svg
              viewBox="0 0 16 16"
              className="w-4 h-4 text-[var(--text-muted)] opacity-0 group-hover:opacity-100 transition-opacity"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <path d="M6 3l5 5-5 5" />
            </svg>
          </div>
        </Link>
      ))}
    </div>
  );
}

// ── Layout C: Spotlight ───────────────────────────────────────────────────────

function SpotlightLayout({ novels }: { novels: Novel[] }) {
  const [hero, ...rest] = novels;
  if (!hero) return null;
  return (
    <div className="space-y-4">
      {/* Hero card */}
      <Link
        href={`/library/${hero.id}`}
        className="group relative block rounded-2xl overflow-hidden h-64 sm:h-80 hover:shadow-[var(--shadow-lift)] transition-shadow duration-200"
      >
        <div className="absolute inset-0">
          <NovelCover novel={hero} className="w-full h-full" />
        </div>
        {/* Gradient overlay */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to top, rgba(0,0,0,0.80) 0%, rgba(0,0,0,0.30) 55%, transparent 100%)",
          }}
        />
        {/* Text */}
        <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8">
          <p className="font-mono text-[10px] text-white/50 uppercase tracking-widest mb-2">
            Featured
          </p>
          <h2 className="font-serif text-2xl sm:text-3xl font-semibold text-white leading-tight mb-3">
            {hero.title}
          </h2>
          <div className="flex items-center gap-3 flex-wrap">
            <StatusBadge status={hero.status} variant="filled" />
            {hero.genres.slice(0, 3).map((g) => (
              <span
                key={g}
                className="text-[10px] px-2.5 py-1 rounded-full bg-white/12 text-white/75"
              >
                {g}
              </span>
            ))}
          </div>
        </div>
      </Link>

      {/* Compact grid for the rest */}
      {rest.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {rest.map((novel) => (
            <Link
              key={novel.id}
              href={`/library/${novel.id}`}
              className="group rounded-xl overflow-hidden border border-[var(--border-default)] bg-[var(--bg-elevated)] hover:-translate-y-1 hover:shadow-[var(--shadow-lift)] transition-all duration-200"
            >
              <NovelCover novel={novel} className="aspect-[2/3] w-full" />
              <div className="p-3 space-y-1.5">
                <h2 className="font-serif font-semibold text-sm leading-snug text-[var(--text-primary)] line-clamp-2">
                  {novel.title}
                </h2>
                <StatusBadge status={novel.status} variant="filled" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Empty search ──────────────────────────────────────────────────────────────

function NoResults({ query }: { query: string }) {
  return (
    <div className="flex flex-col items-center gap-3 py-24 text-center">
      <Search size={28} className="text-[var(--text-muted)] opacity-25" />
      <p className="font-serif text-lg text-[var(--text-primary)]">No novels match</p>
      <p className="text-sm text-[var(--text-muted)] max-w-[28ch]">
        Nothing matched <em>&ldquo;{query}&rdquo;</em>. Try a title, genre, or status.
      </p>
    </div>
  );
}

// ── Layout icons (inline SVG so no extra dep) ─────────────────────────────────

const LAYOUTS: { value: LayoutMode; label: string; icon: React.ReactNode }[] = [
  {
    value: "covers",
    label: "Cover grid",
    icon: (
      <svg viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5">
        <rect x="1" y="1" width="6" height="9" rx="1" />
        <rect x="9" y="1" width="6" height="9" rx="1" />
        <rect x="1" y="12" width="6" height="3" rx="0.5" />
        <rect x="9" y="12" width="6" height="3" rx="0.5" />
      </svg>
    ),
  },
  {
    value: "catalog",
    label: "Catalog list",
    icon: (
      <svg viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5">
        <rect x="1" y="2" width="14" height="3.5" rx="1" />
        <rect x="1" y="6.5" width="14" height="3" rx="1" />
        <rect x="1" y="10.5" width="14" height="3.5" rx="1" />
      </svg>
    ),
  },
  {
    value: "spotlight",
    label: "Spotlight",
    icon: (
      <svg viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5">
        <rect x="1" y="1" width="14" height="7" rx="1" />
        <rect x="1" y="10" width="4" height="5" rx="1" />
        <rect x="6" y="10" width="4" height="5" rx="1" />
        <rect x="11" y="10" width="4" height="5" rx="1" />
      </svg>
    ),
  },
];

// ── Empty library (shown from parent, exported for reuse) ─────────────────────

export function EmptyLibraryView() {
  return (
    <div className="flex flex-col items-center gap-8 py-24 text-center">
      <svg
        width="72"
        height="72"
        viewBox="0 0 72 72"
        fill="none"
        aria-hidden="true"
        className="text-[var(--text-muted)] opacity-30"
      >
        <path
          d="M58 6C58 6 48 16 38 30C28 44 28 60 28 60C28 60 38 50 48 40C58 30 68 20 58 6Z"
          stroke="currentColor"
          strokeWidth="2"
          fill="none"
          strokeLinejoin="round"
        />
        <path d="M28 60L10 68" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path
          d="M44 22L22 44"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeDasharray="4 4"
          opacity="0.5"
        />
        <circle cx="28" cy="60" r="2" fill="currentColor" opacity="0.6" />
      </svg>
      <div>
        <p className="font-serif text-2xl text-[var(--text-primary)] mb-2">Your library awaits.</p>
        <p className="text-sm text-[var(--text-muted)] leading-relaxed max-w-[32ch] mx-auto">
          Every great story starts somewhere. Create your first novel to begin.
        </p>
      </div>
      <NewNovelDialog triggerSize="lg" />
    </div>
  );
}

// ── LibraryView ───────────────────────────────────────────────────────────────

const LS_KEY = "novelgit-library-layout";

export function LibraryView({ novels }: { novels: Novel[] }) {
  const [search, setSearch] = useState("");
  const [layout, setLayout] = useState<LayoutMode>("covers");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(LS_KEY) as LayoutMode | null;
      if (saved && ["covers", "catalog", "spotlight"].includes(saved)) setLayout(saved);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    try { localStorage.setItem(LS_KEY, layout); } catch { /* ignore */ }
  }, [layout]);

  const filtered = useFiltered(novels, search);

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex items-center gap-2.5">
        {/* Search */}
        <div className="relative flex-1">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none"
          />
          <input
            type="text"
            placeholder="Search by title, genre, or status…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-9 pl-8 pr-8 rounded-lg border border-[var(--border-default)] bg-[var(--bg-elevated)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none focus:border-[var(--accent)] transition-colors"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
              aria-label="Clear search"
            >
              <X size={13} />
            </button>
          )}
        </div>

        {/* Layout switcher */}
        <div className="flex items-center gap-0.5 p-1 rounded-lg border border-[var(--border-default)] bg-[var(--bg-elevated)] shrink-0">
          {LAYOUTS.map(({ value, icon, label }) => (
            <button
              key={value}
              onClick={() => setLayout(value)}
              title={label}
              aria-label={label}
              aria-pressed={layout === value}
              className={cn(
                "p-1.5 rounded-md transition-colors",
                layout === value
                  ? "bg-[var(--bg-base)] text-[var(--text-primary)] shadow-sm"
                  : "text-[var(--text-muted)] hover:text-[var(--text-primary)]",
              )}
            >
              {icon}
            </button>
          ))}
        </div>
      </div>

      {/* Count hint when filtering */}
      {search && filtered.length > 0 && (
        <p className="text-xs text-[var(--text-muted)] font-mono">
          {filtered.length} of {novels.length} novels
        </p>
      )}

      {/* Layouts */}
      {filtered.length === 0 ? (
        <NoResults query={search} />
      ) : layout === "covers" ? (
        <CoversLayout novels={filtered} />
      ) : layout === "catalog" ? (
        <CatalogLayout novels={filtered} />
      ) : (
        <SpotlightLayout novels={filtered} />
      )}
    </div>
  );
}
