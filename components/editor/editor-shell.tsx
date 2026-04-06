"use client";

import { useState } from "react";
import { ChapterSidebar } from "./chapter-sidebar";
import { EditorClient } from "./editor-client";

interface Props {
  novelId:        string;
  chapterSlug:    string;
  initialContent: string;
  fetchedAt:      string;
  chapterOrder:   string[];
  chapterTitles:  Record<string, string>;
}

export function EditorShell({
  novelId, chapterSlug, initialContent, fetchedAt, chapterOrder, chapterTitles,
}: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="flex flex-1 overflow-hidden relative">
      {/* Mobile backdrop — closes sidebar when tapping outside */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      <ChapterSidebar
        novelId={novelId}
        chapterOrder={chapterOrder}
        chapterTitles={chapterTitles}
        activeSlug={chapterSlug}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <EditorClient
        novelId={novelId}
        chapterSlug={chapterSlug}
        chapterOrder={chapterOrder}
        initialContent={initialContent}
        fetchedAt={fetchedAt}
        sidebarOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen((v) => !v)}
      />
    </div>
  );
}
