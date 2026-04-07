"use client";

import { useState, useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Search, BookOpen, Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { LoreEntryForm } from "@/components/lore/lore-entry-form";
import { LoreTypeIcon } from "@/components/lore/lore-type-icon";
import { getLoreEntryAction, deleteLoreEntryAction, listLoreEntriesAction } from "./actions";
import { LORE_TYPES } from "@/types/lore";
import type { LoreType, LoreEntry } from "@/types/lore";

type EntryStub = { id: string; type: LoreType; name: string; tags: string[]; updatedAt: string };
type ViewMode  = "list" | "detail" | "edit" | "create";

function relativeDate(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

interface Props {
  novelId:        string;
  initialEntries: EntryStub[];
  initialEntryId?: string;
}

export function LorePageClient({ novelId, initialEntries, initialEntryId }: Props) {
  const router = useRouter();
  const [entries, setEntries]     = useState<EntryStub[]>(initialEntries);
  const [typeFilter, setTypeFilter] = useState<LoreType | "all">("all");
  const [search, setSearch]       = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(initialEntryId ?? null);
  const [viewMode, setViewMode]   = useState<ViewMode>(initialEntryId ? "detail" : "list");
  const [activeEntry, setActiveEntry] = useState<LoreEntry | null>(null);
  const [loadingEntry, setLoadingEntry] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [isDeleting, startDelete]  = useTransition();

  const filtered = useMemo(() => {
    return entries.filter((e) => {
      const matchType = typeFilter === "all" || e.type === typeFilter;
      const q = search.toLowerCase();
      const matchSearch = !q || e.name.toLowerCase().includes(q) || e.tags.some((t) => t.includes(q));
      return matchType && matchSearch;
    });
  }, [entries, typeFilter, search]);

  async function selectEntry(id: string) {
    setSelectedId(id);
    setViewMode("detail");
    setLoadingEntry(true);
    setActiveEntry(null);
    try {
      const entry = await getLoreEntryAction(novelId, id);
      setActiveEntry(entry);
    } finally {
      setLoadingEntry(false);
    }
  }

  async function handleCreateSuccess(slug: string) {
    setSelectedId(slug);
    setViewMode("detail");
    setLoadingEntry(true);
    setActiveEntry(null);
    try {
      const fresh = await listLoreEntriesAction(novelId);
      setEntries(fresh);
      const entry = await getLoreEntryAction(novelId, slug);
      setActiveEntry(entry);
    } catch {
      setActiveEntry(null);
    } finally {
      setLoadingEntry(false);
      router.refresh();
    }
  }

  async function handleUpdateSuccess(slug: string) {
    setViewMode("detail");
    setLoadingEntry(true);
    try {
      const fresh = await listLoreEntriesAction(novelId);
      setEntries(fresh);
      const entry = await getLoreEntryAction(novelId, slug);
      setActiveEntry(entry);
    } catch {
      await selectEntry(slug);
    } finally {
      setLoadingEntry(false);
      router.refresh();
    }
  }

  function handleDelete() {
    if (!selectedId) return;
    setDeleteError("");
    startDelete(async () => {
      try {
        await deleteLoreEntryAction({ novelId, slug: selectedId });
        setEntries((prev) => prev.filter((e) => e.id !== selectedId));
        setSelectedId(null);
        setActiveEntry(null);
        setViewMode("list");
      } catch (err) {
        setDeleteError(err instanceof Error ? err.message : "Delete failed.");
      }
    });
  }

  const showDetail  = viewMode === "detail";
  const showEdit    = viewMode === "edit";
  const showCreate  = viewMode === "create";

  return (
    <div className="flex gap-6 min-h-[60vh]">
      {/* ── Left: Entry list ─────────────────────────────────── */}
      <div className={cn(
        "flex flex-col gap-3 shrink-0",
        "w-full md:w-[300px]",
        // On mobile, hide list when in detail/edit/create
        (showDetail || showEdit || showCreate) && "hidden md:flex",
      )}>
        {/* Type filter */}
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setTypeFilter("all")}
            className={cn(
              "px-2.5 py-0.5 rounded-full text-xs border transition-all duration-150",
              typeFilter === "all"
                ? "bg-[var(--accent)]/10 border-[var(--accent)] text-[var(--accent)] font-medium"
                : "border-[var(--border-default)] text-[var(--text-muted)] hover:border-[var(--accent)]/50",
            )}
          >
            All
          </button>
          {LORE_TYPES.map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={cn(
                "px-2.5 py-0.5 rounded-full text-xs border transition-all duration-150 capitalize",
                typeFilter === t
                  ? "bg-[var(--accent)]/10 border-[var(--accent)] text-[var(--accent)] font-medium"
                  : "border-[var(--border-default)] text-[var(--text-muted)] hover:border-[var(--accent)]/50",
              )}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search lore…"
            className="w-full h-8 pl-8 pr-3 rounded-lg border border-[var(--border-default)] bg-[var(--bg-elevated)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] transition-colors"
          />
        </div>

        {/* New entry button */}
        <Button
          size="sm"
          className="w-full"
          onClick={() => { setSelectedId(null); setActiveEntry(null); setViewMode("create"); }}
        >
          <Plus size={14} />
          New Entry
        </Button>

        {/* List */}
        <div className="flex flex-col gap-0.5">
          {filtered.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)] text-center py-8">
              {entries.length === 0 ? "No lore entries yet." : "No results."}
            </p>
          ) : (
            filtered.map((entry) => (
              <button
                key={entry.id}
                onClick={() => void selectEntry(entry.id)}
                className={cn(
                  "flex items-center gap-2.5 w-full text-left px-3 py-2.5 rounded-lg transition-colors",
                  selectedId === entry.id
                    ? "bg-[var(--accent)]/10 border-l-2 border-[var(--accent)] pl-[10px]"
                    : "hover:bg-[var(--bg-sidebar)]",
                )}
              >
                <LoreTypeIcon type={entry.type} size={13} className="text-[var(--text-muted)] shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[var(--text-primary)] truncate">{entry.name}</p>
                  <p className="text-[10px] text-[var(--text-muted)] capitalize">{entry.type} · {relativeDate(entry.updatedAt)}</p>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* ── Right: Detail / Edit / Create ───────────────────── */}
      <div className={cn(
        "flex-1 min-w-0 rounded-xl border border-[var(--border-default)] bg-[var(--bg-elevated)]",
        // Mobile: show only when not in list mode
        !showDetail && !showEdit && !showCreate && "hidden md:flex",
        "flex flex-col",
      )}>

        {/* ── Empty state ── */}
        {!showDetail && !showEdit && !showCreate && (
          <div className="flex flex-col items-center justify-center gap-4 flex-1 text-center px-8 py-16">
            <BookOpen size={40} className="text-[var(--text-muted)] opacity-30" />
            <div>
              <p className="font-serif text-lg text-[var(--text-primary)] mb-1">Select an entry</p>
              <p className="text-sm text-[var(--text-muted)]">Or create your first lore entry to start building your world.</p>
            </div>
            <Button size="sm" onClick={() => setViewMode("create")}>
              <Plus size={14} />
              New Entry
            </Button>
          </div>
        )}

        {/* ── Create mode ── */}
        {showCreate && (
          <div className="p-6 overflow-y-auto">
            <h2 className="font-serif text-xl font-semibold text-[var(--text-primary)] mb-6">New Lore Entry</h2>
            <LoreEntryForm
              novelId={novelId}
              onSuccess={handleCreateSuccess}
              onCancel={() => setViewMode(selectedId ? "detail" : "list")}
            />
          </div>
        )}

        {/* ── Edit mode ── */}
        {showEdit && activeEntry && (
          <div className="p-6 overflow-y-auto">
            <h2 className="font-serif text-xl font-semibold text-[var(--text-primary)] mb-6">Edit Entry</h2>
            <LoreEntryForm
              novelId={novelId}
              initial={activeEntry}
              onSuccess={handleUpdateSuccess}
              onCancel={() => setViewMode("detail")}
            />
          </div>
        )}

        {/* ── Detail mode ── */}
        {showDetail && (
          <div className="flex flex-col flex-1 overflow-hidden">
            {/* Mobile back */}
            <div className="md:hidden px-5 pt-4">
              <button
                onClick={() => { setSelectedId(null); setViewMode("list"); }}
                className="inline-flex items-center gap-1.5 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
              >
                ← All entries
              </button>
            </div>

            {loadingEntry ? (
              <div className="flex items-center justify-center flex-1 gap-2 text-[var(--text-muted)]">
                <Loader2 size={16} className="animate-spin" />
                <span className="text-sm">Loading…</span>
              </div>
            ) : activeEntry ? (
              <div className="flex flex-col flex-1 overflow-hidden">
                {/* Header */}
                <div className="flex items-start justify-between gap-4 px-6 pt-5 pb-4 border-b border-[var(--border-default)]">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <LoreTypeIcon type={activeEntry.type} size={16} className="text-[var(--text-muted)] shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <h2 className="font-serif text-xl font-semibold text-[var(--text-primary)] leading-snug">
                        {activeEntry.name}
                      </h2>
                      <p className="text-xs text-[var(--text-muted)] mt-0.5 capitalize">
                        {activeEntry.type}
                        {activeEntry.tags.length > 0 && ` · ${activeEntry.tags.join(", ")}`}
                        {activeEntry.created && ` · ${activeEntry.created}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      title="Edit"
                      onClick={() => setViewMode("edit")}
                    >
                      <Pencil size={14} />
                    </Button>
                    <Button
                      size="icon-sm"
                      variant="destructive"
                      title="Delete"
                      onClick={handleDelete}
                      disabled={isDeleting}
                    >
                      {isDeleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                    </Button>
                  </div>
                </div>

                {deleteError && (
                  <p className="px-6 pt-3 text-xs text-destructive">{deleteError}</p>
                )}

                {/* Body */}
                <div className="flex-1 overflow-y-auto px-6 py-5">
                  {activeEntry.body ? (
                    <div className="prose prose-sm max-w-none dark:prose-invert text-[var(--text-primary)]">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{activeEntry.body}</ReactMarkdown>
                    </div>
                  ) : (
                    <p className="text-sm text-[var(--text-muted)] italic">No description yet. Click Edit to add content.</p>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
