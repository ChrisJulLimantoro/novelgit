"use client";

import { useState, useCallback } from "react";
import { ChapterSidebar } from "./chapter-sidebar";
import { EditorClient } from "./editor-client";
import { LoreSidebar } from "./lore-sidebar";
import { AiSidebar } from "./ai-sidebar";

type RightPanel = "lore" | "ai" | null;

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
  const [sidebarOpen, setSidebarOpen]     = useState(true);
  const [rightPanel, setRightPanel]       = useState<RightPanel>(null);
  const [wikiLinkTarget, setWikiLinkTarget] = useState<string | undefined>();

  const handleWikiLinkClick = useCallback((name: string) => {
    setWikiLinkTarget(name);
    setRightPanel("lore");
  }, []);

  function toggleLore() {
    setRightPanel((p) => (p === "lore" ? null : "lore"));
  }

  function toggleAi() {
    setRightPanel((p) => (p === "ai" ? null : "ai"));
  }

  return (
    <div className="flex flex-1 overflow-hidden relative">
      {/* Mobile backdrop — closes left sidebar */}
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
        loreSidebarOpen={rightPanel === "lore"}
        onToggleLore={toggleLore}
        aiSidebarOpen={rightPanel === "ai"}
        onToggleAi={toggleAi}
        onWikiLinkClick={handleWikiLinkClick}
      />

      {/* Right panel — Lore */}
      <LoreSidebar
        novelId={novelId}
        open={rightPanel === "lore"}
        onClose={() => setRightPanel(null)}
        highlight={wikiLinkTarget}
      />

      {/* Right panel — AI Chat */}
      <AiSidebar
        novelId={novelId}
        open={rightPanel === "ai"}
        onClose={() => setRightPanel(null)}
      />
    </div>
  );
}
