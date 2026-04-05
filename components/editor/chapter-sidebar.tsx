"use client";

import { useState } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Plus } from "lucide-react";
import Link from "next/link";
import { reorderChapters, createChapter } from "@/app/(editor)/edit/[novelId]/[chapterSlug]/actions";

interface Props {
  novelId:      string;
  chapterOrder: string[];
  activeSlug:   string;
}

function SortableChapter({ slug, novelId, isActive }: { slug: string; novelId: string; isActive: boolean }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: slug });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    scale:   isDragging ? "1.02" : "1",
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm cursor-pointer
        ${isActive ? "bg-[var(--accent)]/10 text-[var(--accent)]" : "hover:bg-[var(--bg-sidebar)]"}`}
    >
      <button
        {...attributes}
        {...listeners}
        aria-label={`Drag to reorder ${slug}`}
        className="text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-grab"
      >
        <GripVertical size={14} />
      </button>
      <Link href={`/edit/${novelId}/${slug}`} className="flex-1 truncate">
        {slug.replace(/^\d+-/, "").replace(/-/g, " ")}
      </Link>
    </div>
  );
}

export function ChapterSidebar({ novelId, chapterOrder: initial, activeSlug }: Props) {
  const [chapters, setChapters] = useState(initial);
  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor));

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = chapters.indexOf(active.id as string);
    const newIndex = chapters.indexOf(over.id as string);
    const reordered = arrayMove(chapters, oldIndex, newIndex);
    setChapters(reordered); // optimistic update
    await reorderChapters(novelId, reordered);
  }

  async function handleNewChapter() {
    const title = window.prompt("Chapter title:");
    if (!title) return;
    const slug = await createChapter(novelId, title);
    setChapters((prev) => [...prev, slug]);
  }

  return (
    <aside
      role="navigation"
      aria-label="Chapter list"
      className="w-[var(--sidebar-width)] border-r border-[var(--border-default)] flex flex-col bg-[var(--bg-sidebar)] overflow-y-auto shrink-0"
    >
      <div className="p-3 border-b border-[var(--border-default)] flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Chapters</span>
        <button onClick={handleNewChapter} aria-label="New chapter" className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
          <Plus size={16} />
        </button>
      </div>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={chapters} strategy={verticalListSortingStrategy}>
          <div className="flex flex-col gap-1 p-2">
            {chapters.map((slug) => (
              <SortableChapter key={slug} slug={slug} novelId={novelId} isActive={slug === activeSlug} />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </aside>
  );
}
