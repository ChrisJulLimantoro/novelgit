"use client";

import { useState, useEffect, useRef, useTransition } from "react";
import { useDebouncedCallback } from "use-debounce";
import { X, Search, BookOpen, ArrowLeft, Loader2, ExternalLink } from "lucide-react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";
import { LoreTypeIcon } from "@/components/lore/lore-type-icon";
import { searchLore } from "@/app/(editor)/edit/[novelId]/[chapterSlug]/ai-actions";
import type { LoreEntry } from "@/types/lore";

const SEARCH_DEBOUNCE_MS = 350;

interface Props {
  novelId:    string;
  open:       boolean;
  onClose:    () => void;
  highlight?: string;
}

export function LoreSidebar({ novelId, open, onClose, highlight }: Props) {
  const [query, setQuery]         = useState("");
  const [results, setResults]     = useState<LoreEntry[]>([]);
  const [selected, setSelected]   = useState<LoreEntry | null>(null);
  const [isDebounceWaiting, setIsDebounceWaiting] = useState(false);
  const [isSearching, startSearch] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const lastHighlight = useRef<string | undefined>(undefined);
  const searchGeneration = useRef(0);
  const novelIdRef = useRef(novelId);
  novelIdRef.current = novelId;

  const debouncedSearch = useDebouncedCallback((q: string) => {
    setIsDebounceWaiting(false);
    const gen = searchGeneration.current;
    startSearch(async () => {
      const res = await searchLore(novelIdRef.current, q, 5);
      if (gen !== searchGeneration.current) return;
      setResults(res);
    });
  }, SEARCH_DEBOUNCE_MS);

  // When highlight changes (WikiLink click), run a search for that name (no debounce)
  useEffect(() => {
    if (!open) return;
    if (highlight && highlight !== lastHighlight.current) {
      lastHighlight.current = highlight;
      debouncedSearch.cancel();
      searchGeneration.current += 1;
      const gen = searchGeneration.current;
      setIsDebounceWaiting(false);
      setQuery(highlight);
      setSelected(null);
      startSearch(async () => {
        const res = await searchLore(novelId, highlight, 5);
        if (gen !== searchGeneration.current) return;
        setResults(res);
        if (res.length > 0 && res[0].name.toLowerCase() === highlight.toLowerCase()) {
          setSelected(res[0]);
        }
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [highlight, open, novelId]);

  useEffect(() => {
    if (!open) {
      debouncedSearch.cancel();
      setIsDebounceWaiting(false);
    }
  }, [open, debouncedSearch]);

  // Focus search input when opening
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  function handleQueryChange(raw: string) {
    setQuery(raw);
    setSelected(null);
    const trimmed = raw.trim();
    if (!trimmed) {
      debouncedSearch.cancel();
      searchGeneration.current += 1;
      setIsDebounceWaiting(false);
      setResults([]);
      return;
    }
    searchGeneration.current += 1;
    setIsDebounceWaiting(true);
    debouncedSearch(trimmed);
  }

  const queryActive = query.trim() !== "";
  const resultsLoading = queryActive && (isDebounceWaiting || isSearching);

  if (!open) return null;

  return (
    <div className="flex flex-col w-[300px] shrink-0 border-l border-[var(--border-default)] bg-[var(--bg-sidebar)] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-default)] shrink-0">
        <span className="text-sm font-semibold text-[var(--text-primary)]">Lore</span>
        <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
          <X size={15} />
        </button>
      </div>

      {/* Search */}
      <div className="px-3 py-2.5 border-b border-[var(--border-default)] shrink-0">
        <div className="relative">
          {resultsLoading
            ? <Loader2 size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] animate-spin" />
            : <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none" />
          }
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            placeholder="Search lore…"
            className="w-full h-7 pl-7 pr-2.5 rounded-md border border-[var(--border-default)] bg-[var(--bg-elevated)] text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] transition-colors"
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Detail view */}
        {selected ? (
          <div className="flex flex-col">
            <button
              onClick={() => setSelected(null)}
              className="flex items-center gap-1.5 px-4 py-2.5 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors border-b border-[var(--border-default)]"
            >
              <ArrowLeft size={12} /> Back to results
            </button>
            <div className="px-4 py-3 border-b border-[var(--border-default)]">
              <div className="flex items-center gap-2 mb-1">
                <LoreTypeIcon type={selected.type} size={13} className="text-[var(--text-muted)] shrink-0" />
                <span className="text-sm font-semibold text-[var(--text-primary)]">{selected.name}</span>
              </div>
              <p className="text-[10px] text-[var(--text-muted)] capitalize">
                {selected.type}
                {selected.tags.length > 0 && ` · ${selected.tags.join(", ")}`}
              </p>
            </div>
            <div className="px-4 py-3 flex-1">
              {selected.body ? (
                <div className="prose prose-xs max-w-none dark:prose-invert text-[var(--text-primary)]">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{selected.body}</ReactMarkdown>
                </div>
              ) : (
                <p className="text-xs text-[var(--text-muted)] italic">No description yet.</p>
              )}
            </div>
            <div className="px-4 py-3 border-t border-[var(--border-default)]">
              <Link
                href={`/library/${novelId}/lore?entry=${selected.id}`}
                target="_blank"
                className="flex items-center gap-1.5 text-xs text-[var(--accent)] hover:underline"
              >
                <ExternalLink size={11} />
                Open in Lore
              </Link>
            </div>
          </div>
        ) : (
          /* Results list */
          <div className="flex flex-col">
            {!queryActive ? (
              <div className="flex flex-col items-center gap-3 py-10 px-4 text-center">
                <BookOpen size={28} className="text-[var(--text-muted)] opacity-30" />
                <p className="text-xs text-[var(--text-muted)]">
                  Search your lore, or click a <span className="text-[var(--accent)]">[[WikiLink]]</span> in the text.
                </p>
              </div>
            ) : resultsLoading ? (
              <div className="flex flex-col items-center justify-center gap-2 py-12 px-4 text-center">
                <Loader2 size={22} className="text-[var(--text-muted)] animate-spin opacity-80" />
                <p className="text-xs text-[var(--text-muted)]">Searching lore…</p>
              </div>
            ) : results.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <p className="text-xs text-[var(--text-muted)]">No lore entries found for &quot;{query.trim()}&quot;.</p>
              </div>
            ) : (
              results.map((entry) => (
                <button
                  key={entry.id}
                  onClick={() => setSelected(entry)}
                  className={cn(
                    "flex items-start gap-2.5 text-left w-full px-4 py-3 border-b border-[var(--border-default)]",
                    "hover:bg-[var(--bg-elevated)] transition-colors",
                  )}
                >
                  <LoreTypeIcon type={entry.type} size={13} className="text-[var(--text-muted)] shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-[var(--text-primary)] truncate">{entry.name}</p>
                    <p className="text-[10px] text-[var(--text-muted)] capitalize mb-1">{entry.type}</p>
                    {entry.body && (
                      <p className="text-[10px] text-[var(--text-muted)] line-clamp-2 leading-relaxed">
                        {entry.body.replace(/^#+ .+$/gm, "").trim().slice(0, 80)}
                      </p>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="shrink-0 px-3 py-2.5 border-t border-[var(--border-default)] flex items-center justify-between">
        <Link
          href={`/library/${novelId}/lore`}
          target="_blank"
          className="text-xs text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors flex items-center gap-1"
        >
          <ExternalLink size={10} />
          Open Lore
        </Link>
      </div>
    </div>
  );
}
