"use client";

import { useState, useRef, useEffect } from "react";
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor,
  useSensor, useSensors, type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext, verticalListSortingStrategy,
  useSortable, arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Plus, Check, X, Loader2 } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { reorderChapters, createChapter, renameChapterTitle } from "@/app/(editor)/edit/[novelId]/[chapterSlug]/actions";

interface SortableProps {
  slug:          string;
  novelId:       string;
  isActive:      boolean;
  displayTitle:  string;
}

function SortableChapter({ slug, novelId, isActive, displayTitle }: SortableProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: slug });
  const [editing, setEditing]     = useState(false);
  const [draft, setDraft]         = useState(displayTitle);
  const [renameError, setRenameError] = useState<string | null>(null);
  const [isRenaming, setIsRenaming]   = useState(false);
  const inputRef                  = useRef<HTMLInputElement>(null);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  async function commitRename() {
    setRenameError(null);
    const trimmed = draft.trim();
    if (!trimmed || trimmed === displayTitle) {
      setEditing(false);
      return;
    }
    setIsRenaming(true);
    try {
      await renameChapterTitle(novelId, slug, trimmed);
      setEditing(false);
    } catch {
      setRenameError("Could not save. Try again.");
    } finally {
      setIsRenaming(false);
    }
  }

  function startEditing() {
    setRenameError(null);
    setDraft(displayTitle);
    setEditing(true);
    setTimeout(() => inputRef.current?.select(), 0);
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-1.5 px-2 py-2 rounded-md text-sm",
        isActive
          ? "bg-[var(--accent)]/10 text-[var(--accent)]"
          : "hover:bg-[var(--bg-sidebar)] text-[var(--text-primary)]",
      )}
    >
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        aria-label={`Reorder ${displayTitle}`}
        className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-grab shrink-0 touch-none"
      >
        <GripVertical size={13} />
      </button>

      {editing ? (
        /* Inline rename input */
        <div className="flex items-center gap-1 flex-1 min-w-0">
          <input
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !isRenaming) void commitRename();
              if (e.key === "Escape" && !isRenaming) setEditing(false);
            }}
            disabled={isRenaming}
            className="flex-1 min-w-0 bg-transparent border-b border-[var(--accent)] outline-none text-sm text-[var(--text-primary)] py-0.5 disabled:opacity-60"
            autoFocus
          />
          {renameError && (
            <p className="text-[10px] text-destructive shrink-0 max-w-[8rem]">{renameError}</p>
          )}
          <button
            type="button"
            onClick={() => void commitRename()}
            disabled={isRenaming}
            className="text-[var(--status-writing)] shrink-0 disabled:opacity-40"
          >
            {isRenaming ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
          </button>
          <button
            onClick={() => setEditing(false)}
            disabled={isRenaming}
            className="text-[var(--text-muted)] shrink-0 disabled:opacity-40"
          >
            <X size={12} />
          </button>
        </div>
      ) : (
        /* Normal row */
        <Link
          href={`/edit/${novelId}/${slug}`}
          className="flex-1 truncate capitalize leading-snug"
          onDoubleClick={(e) => { e.preventDefault(); startEditing(); }}
        >
          {displayTitle}
        </Link>
      )}
    </div>
  );
}

interface Props {
  novelId:       string;
  chapterOrder:  string[];
  chapterTitles: Record<string, string>;
  activeSlug:    string;
  open:          boolean;
  onClose:       () => void;
}

export function ChapterSidebar({
  novelId, chapterOrder: initial, chapterTitles, activeSlug, open, onClose,
}: Props) {
  const [chapters, setChapters]     = useState(initial);
  const [creating, setCreating]       = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);
  const [newTitle, setNewTitle]       = useState("");
  const [createError, setCreateError] = useState<string | null>(null);
  const [reorderError, setReorderError] = useState<string | null>(null);
  const newInputRef                   = useRef<HTMLInputElement>(null);
  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor));

  useEffect(() => {
    if (creating) newInputRef.current?.focus();
  }, [creating]);

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = chapters.indexOf(active.id as string);
    const newIndex = chapters.indexOf(over.id as string);
    const prev = chapters;
    const reordered = arrayMove(chapters, oldIndex, newIndex);
    setChapters(reordered);
    setReorderError(null);
    try {
      await reorderChapters(novelId, reordered);
    } catch {
      setChapters(prev);
      setReorderError("Reorder failed — order reverted.");
    }
  }

  async function commitNewChapter() {
    setCreateError(null);
    const title = newTitle.trim();
    if (!title) {
      setNewTitle("");
      setCreating(false);
      return;
    }
    setIsCommitting(true);
    try {
      const slug = await createChapter(novelId, title);
      setChapters((p) => [...p, slug]);
      setNewTitle("");
      setCreating(false);
    } catch {
      setCreateError("Could not create chapter.");
    } finally {
      setIsCommitting(false);
    }
  }

  function handleNewChapter() {
    setCreateError(null);
    setNewTitle("");
    setCreating(true);
  }

  function prettySlug(slug: string) {
    return slug.replace(/^\d+-/, "").replace(/-/g, " ");
  }

  return (
    <aside
      role="navigation"
      aria-label="Chapter list"
      className={cn(
        "flex flex-col bg-[var(--bg-sidebar)] border-r border-[var(--border-default)] overflow-y-auto shrink-0",
        "transition-transform duration-200",
        // Mobile: fixed overlay drawer
        "fixed inset-y-0 left-0 z-40 w-[min(18rem,85vw)]",
        // Desktop: in-flow, toggled via hidden
        "md:relative md:w-[var(--sidebar-width)] md:z-auto",
        open
          ? "translate-x-0"
          : "-translate-x-full md:translate-x-0 md:hidden",
      )}
    >
      {/* Header */}
      <div className="px-3 py-2.5 border-b border-[var(--border-default)] flex items-center justify-between shrink-0">
        <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] select-none">
          Chapters
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={handleNewChapter}
            aria-label="New chapter"
            className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--border-default)]"
          >
            <Plus size={14} />
          </button>
          {/* Close button — visible on mobile */}
          <button
            onClick={onClose}
            aria-label="Close chapter list"
            className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--border-default)] md:hidden"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Chapter list */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={chapters} strategy={verticalListSortingStrategy}>
          <div className="flex flex-col gap-0.5 p-2 overflow-y-auto flex-1">
            {chapters.length === 0 && (
              <p className="text-xs text-[var(--text-muted)] px-2 py-3 text-center">
                No chapters yet.<br />Click + to add one.
              </p>
            )}
            {chapters.map((slug) => (
              <SortableChapter
                key={slug}
                slug={slug}
                novelId={novelId}
                isActive={slug === activeSlug}
                displayTitle={chapterTitles[slug] ?? prettySlug(slug)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {/* New chapter inline input */}
      {creating && (
        <div className="px-3 py-2 border-t border-[var(--border-default)] shrink-0">
          <div className="flex items-center gap-1">
            <input
              ref={newInputRef}
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !isCommitting) void commitNewChapter();
                if (e.key === "Escape" && !isCommitting) { setCreating(false); setNewTitle(""); setCreateError(null); }
              }}
              disabled={isCommitting}
              placeholder="Chapter title…"
              className="flex-1 min-w-0 bg-transparent border-b border-[var(--accent)] outline-none text-sm text-[var(--text-primary)] py-0.5 placeholder:text-[var(--text-muted)] disabled:opacity-60"
            />
            <button
              type="button"
              onClick={() => void commitNewChapter()}
              disabled={isCommitting}
              aria-label="Confirm"
              className="text-[var(--status-writing)] shrink-0 disabled:opacity-40"
            >
              {isCommitting ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
            </button>
            <button
              type="button"
              onClick={() => { setCreating(false); setNewTitle(""); setCreateError(null); }}
              disabled={isCommitting}
              aria-label="Cancel"
              className="text-[var(--text-muted)] shrink-0 disabled:opacity-40"
            >
              <X size={12} />
            </button>
          </div>
          {createError && (
            <p className="text-[10px] text-destructive mt-1">{createError}</p>
          )}
        </div>
      )}

      {reorderError && (
        <div className="px-3 py-2 border-t border-[var(--border-default)] shrink-0 flex items-center justify-between gap-2">
          <p className="text-[10px] text-destructive">{reorderError}</p>
          <button
            type="button"
            onClick={() => setReorderError(null)}
            className="text-[var(--text-muted)] hover:text-[var(--text-primary)] shrink-0"
          >
            <X size={10} />
          </button>
        </div>
      )}

      {/* Double-click hint */}
      <p className="px-3 py-2 text-[10px] text-[var(--text-muted)] border-t border-[var(--border-default)] shrink-0">
        Double-click a chapter to rename
      </p>
    </aside>
  );
}
