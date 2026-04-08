"use client";

import { useState, useMemo, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Search, BookOpen, Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { LoreEntryForm } from "@/components/lore/lore-entry-form";
import { LoreTypeIcon } from "@/components/lore/lore-type-icon";
import { PendingOverlay } from "@/components/ui/pending-overlay";
import { getLoreEntryAction, deleteLoreEntryAction, listLoreEntriesAction } from "./actions";
import {
  LORE_CLUSTERS,
  LORE_TYPE_LABELS,
  typesInCluster,
  clusterForType,
  type LoreClusterFilter,
} from "@/lib/lore-categories";
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
  const [entries, setEntries]       = useState<EntryStub[]>(initialEntries);
  const [clusterFilter, setClusterFilter] = useState<LoreClusterFilter>("all");
  const [search, setSearch]         = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(initialEntryId ?? null);
  const [viewMode, setViewMode]     = useState<ViewMode>(initialEntryId ? "detail" : "list");
  const [activeEntry, setActiveEntry] = useState<LoreEntry | null>(null);
  const [loadingEntry, setLoadingEntry] = useState(!!initialEntryId);
  const [deleteError, setDeleteError] = useState("");
  const [isDeleting, startDelete]  = useTransition();
  const [createPreset, setCreatePreset] = useState<LoreType | null>(null);

  // Fetch the entry that was linked to directly (e.g. from the library novel page)
  useEffect(() => {
    if (!initialEntryId) return;
    setLoadingEntry(true);
    setActiveEntry(null);
    getLoreEntryAction(novelId, initialEntryId)
      .then((entry) => setActiveEntry(entry))
      .catch(() => setActiveEntry(null))
      .finally(() => setLoadingEntry(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const allowed = typesInCluster(clusterFilter);
    return entries.filter((e) => {
      const matchCluster = !allowed || allowed.includes(e.type);
      const q = search.toLowerCase();
      const matchSearch = !q || e.name.toLowerCase().includes(q) || e.tags.some((t) => t.includes(q));
      return matchCluster && matchSearch;
    });
  }, [entries, clusterFilter, search]);

  const groupedSections = useMemo(() => {
    const q = search.trim();
    return LORE_CLUSTERS.map((cluster) => ({
      cluster,
      entries: filtered.filter((e) => cluster.types.includes(e.type)),
    })).filter(({ cluster, entries: list }) => {
      if (clusterFilter !== "all") {
        const allowed = typesInCluster(clusterFilter);
        if (!allowed) return false;
        return cluster.types.some((t) => allowed.includes(t));
      }
      if (q) return list.length > 0;
      return true;
    });
  }, [filtered, clusterFilter, search]);

  function openCreate(preset: LoreType | null) {
    setSelectedId(null);
    setActiveEntry(null);
    setCreatePreset(preset);
    setViewMode("create");
  }

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
    setCreatePreset(null);
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
    <div className="flex gap-0 md:gap-6 min-h-[60vh]">
      {/* ── Left: clustered list ───────────────────────────── */}
      <div className={cn(
        "flex flex-col gap-4 shrink-0",
        "w-full md:w-[320px]",
        (showDetail || showEdit || showCreate) && "hidden md:flex",
      )}>
        {/* Cluster filter */}
        <div className="flex flex-col gap-1.5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
            Show
          </p>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setClusterFilter("all")}
              className={cn(
                "px-2.5 py-1 rounded-lg text-xs border transition-all duration-150",
                clusterFilter === "all"
                  ? "bg-[var(--accent)]/10 border-[var(--accent)] text-[var(--accent)] font-medium"
                  : "border-[var(--border-default)] text-[var(--text-muted)] hover:border-[var(--accent)]/50",
              )}
            >
              All
            </button>
            {LORE_CLUSTERS.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setClusterFilter(c.id)}
                className={cn(
                  "px-2.5 py-1 rounded-lg text-xs border transition-all duration-150 font-medium",
                  clusterFilter === c.id
                    ? "bg-[var(--accent)]/10 border-[var(--accent)] text-[var(--accent)]"
                    : "border-[var(--border-default)] text-[var(--text-muted)] hover:border-[var(--accent)]/50",
                )}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search names and tags…"
            className="w-full h-9 pl-8 pr-3 rounded-lg border border-[var(--border-default)] bg-[var(--bg-elevated)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] transition-colors"
          />
        </div>

        {/* Grouped entries */}
        <div className="flex flex-col gap-5 flex-1 min-h-0 overflow-y-auto pr-0.5 -mr-0.5">
          {groupedSections.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)] text-center py-8">
              No matching entries.
            </p>
          ) : (
            groupedSections.map(({ cluster, entries: sectionEntries }) => (
              <section
                key={cluster.id}
                className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-elevated)]/60 overflow-hidden"
              >
                <div className="px-3 pt-3 pb-2 border-b border-[var(--border-default)]/80 bg-[var(--bg-sidebar)]/40">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h2 className="text-sm font-semibold text-[var(--text-primary)] tracking-tight">
                        {cluster.label}
                      </h2>
                      <p className="text-[10px] text-[var(--text-muted)] leading-snug mt-0.5">
                        {cluster.blurb}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-2.5">
                    {cluster.types.map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => openCreate(t)}
                        className={cn(
                          "inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[10px] font-medium transition-colors",
                          "border-[var(--accent)]/35 text-[var(--accent)] bg-[var(--accent)]/5",
                          "hover:bg-[var(--accent)]/12 hover:border-[var(--accent)]/55",
                        )}
                      >
                        <Plus size={11} strokeWidth={2.5} />
                        New {LORE_TYPE_LABELS[t]}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex flex-col py-1">
                  {sectionEntries.length === 0 ? (
                    <p className="text-xs text-[var(--text-muted)] px-3 py-4 text-center">
                      No {cluster.label.toLowerCase()} yet — use the buttons above.
                    </p>
                  ) : (
                    sectionEntries.map((entry) => (
                      <button
                        key={entry.id}
                        type="button"
                        onClick={() => void selectEntry(entry.id)}
                        className={cn(
                          "flex items-center gap-2.5 w-full text-left px-3 py-2.5 transition-colors",
                          selectedId === entry.id
                            ? "bg-[var(--accent)]/10 border-l-2 border-[var(--accent)] pl-[10px]"
                            : "hover:bg-[var(--bg-sidebar)]/80",
                        )}
                      >
                        <LoreTypeIcon type={entry.type} size={13} className="text-[var(--text-muted)] shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-[var(--text-primary)] truncate">{entry.name}</p>
                          <p className="text-[10px] text-[var(--text-muted)]">
                            {LORE_TYPE_LABELS[entry.type]} · {relativeDate(entry.updatedAt)}
                          </p>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </section>
            ))
          )}
        </div>

        <p className="text-[10px] text-[var(--text-muted)] leading-relaxed">
          Entries are grouped as <strong className="text-[var(--text-primary)] font-medium">Characters</strong>,{" "}
          <strong className="text-[var(--text-primary)] font-medium">World</strong> (locations and items),{" "}
          <strong className="text-[var(--text-primary)] font-medium">Factions</strong>, and{" "}
          <strong className="text-[var(--text-primary)] font-medium">Events</strong>.
        </p>
      </div>

      {/* ── Right: Detail / Edit / Create ───────────────────── */}
      <div className={cn(
        "relative flex-1 min-w-0 rounded-xl border border-[var(--border-default)] bg-[var(--bg-elevated)]",
        !showDetail && !showEdit && !showCreate && "hidden md:flex",
        "flex flex-col",
      )}>
        {isDeleting && <PendingOverlay label="Deleting entry…" />}

        {!showDetail && !showEdit && !showCreate && (
          <div className="flex flex-col items-center justify-center gap-4 flex-1 text-center px-8 py-16">
            <BookOpen size={40} className="text-[var(--text-muted)] opacity-30" />
            <div>
              <p className="font-serif text-lg text-[var(--text-primary)] mb-1">Select an entry</p>
              <p className="text-sm text-[var(--text-muted)] max-w-sm mx-auto">
                Pick something from the left, or start with <strong className="text-[var(--text-primary)] font-medium">New …</strong> under the right category.
              </p>
            </div>
            <Button size="sm" variant="outline" onClick={() => openCreate(null)}>
              <Plus size={14} />
              New entry (choose type)
            </Button>
          </div>
        )}

        {showCreate && (
          <div className="p-4 sm:p-6 overflow-y-auto">
            <h2 className="font-serif text-xl font-semibold text-[var(--text-primary)] mb-1">
              {createPreset ? `New ${LORE_TYPE_LABELS[createPreset]}` : "New lore entry"}
            </h2>
            <p className="text-sm text-[var(--text-muted)] mb-6">
              {createPreset
                ? `This will be saved as ${LORE_TYPE_LABELS[createPreset].toLowerCase()} lore under ${clusterForType(createPreset).label}.`
                : "Choose a type below, then name your entry and add details."}
            </p>
            <LoreEntryForm
              key={createPreset ?? "free"}
              novelId={novelId}
              presetType={createPreset ?? undefined}
              onSuccess={handleCreateSuccess}
              onCancel={() => {
                setCreatePreset(null);
                setViewMode(selectedId ? "detail" : "list");
              }}
            />
          </div>
        )}

        {showEdit && activeEntry && (
          <div className="p-4 sm:p-6 overflow-y-auto">
            <h2 className="font-serif text-xl font-semibold text-[var(--text-primary)] mb-6">Edit entry</h2>
            <LoreEntryForm
              novelId={novelId}
              initial={activeEntry}
              onSuccess={handleUpdateSuccess}
              onCancel={() => setViewMode("detail")}
            />
          </div>
        )}

        {showDetail && (
          <div className="flex flex-col flex-1 overflow-hidden">
            <div className="md:hidden px-5 pt-4">
              <button
                type="button"
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
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 px-4 sm:px-6 pt-4 sm:pt-5 pb-4 border-b border-[var(--border-default)]">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <LoreTypeIcon type={activeEntry.type} size={16} className="text-[var(--accent)] shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-0.5">
                        {clusterForType(activeEntry.type).label} · {LORE_TYPE_LABELS[activeEntry.type]}
                      </p>
                      <h2 className="font-serif text-xl font-semibold text-[var(--text-primary)] leading-snug">
                        {activeEntry.name}
                      </h2>
                      <p className="text-xs text-[var(--text-muted)] mt-0.5">
                        {activeEntry.tags.length > 0 && `${activeEntry.tags.join(", ")} · `}
                        {activeEntry.created}
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
