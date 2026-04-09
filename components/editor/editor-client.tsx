"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { WikiLinkExtension } from "./wikilink-extension";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Markdown } from "tiptap-markdown";
import Placeholder from "@tiptap/extension-placeholder";
import Typography from "@tiptap/extension-typography";
import CharacterCount from "@tiptap/extension-character-count";
import { useDebouncedCallback } from "use-debounce";
import { saveDraft, loadDraft, clearDraft } from "@/lib/local-draft";
import { loadReaderPrefs, saveReaderPrefs, type FontSize, type ReadingTheme } from "@/lib/reader-prefs";
import { useTheme } from "@/components/theme-provider";
import { syncChapter } from "@/app/(editor)/edit/[novelId]/[chapterSlug]/actions";
import { DraftRestoreDialog } from "./draft-restore-dialog";
import { SyncStatusBanner } from "./sync-status-banner";
import { EditorToolbar } from "./editor-toolbar";
import { ChapterReadNav } from "./chapter-read-nav";
import { cn } from "@/lib/utils";
import { useGlobalLoader } from "@/components/ui/global-loader";

interface Props {
  novelId:          string;
  chapterSlug:      string;
  chapterOrder:     string[];
  initialContent:   string;
  fetchedAt:        string;
  sidebarOpen:      boolean;
  onToggleSidebar:  () => void;
  loreSidebarOpen:  boolean;
  onToggleLore:     () => void;
  aiSidebarOpen:    boolean;
  onToggleAi:       () => void;
  bibleSidebarOpen: boolean;
  onToggleBible:    () => void;
  onWikiLinkClick:  (name: string) => void;
}

type SyncState = "idle" | "syncing" | "success" | "error";

export function EditorClient({
  novelId, chapterSlug, chapterOrder, initialContent, fetchedAt, sidebarOpen, onToggleSidebar,
  loreSidebarOpen, onToggleLore, aiSidebarOpen, onToggleAi, bibleSidebarOpen, onToggleBible, onWikiLinkClick,
}: Props) {
  const { resolvedTheme } = useTheme();
  const { startLoading, stopLoading } = useGlobalLoader();
  const [editMode, setEditMode]       = useState(false); // read-first
  const [syncState, setSyncState]     = useState<SyncState>("idle");
  const [showRestore, setShowRestore] = useState(false);
  const [draftDate, setDraftDate]     = useState("");
  const [fontSize, setFontSize]       = useState<FontSize>("md");
  const [readingTheme, setReadingTheme] = useState<ReadingTheme>("default");

  // Keep a ref to latest markdown for sync — avoids stale closure in keydown handler
  const latestMd = useRef(initialContent);
  const syncInFlightRef = useRef(false);
  const editorContainerRef = useRef<HTMLDivElement>(null);

  const autosave = useDebouncedCallback((md: string) => {
    saveDraft(novelId, chapterSlug, md);
  }, 1500);

  // DOM event delegation for WikiLink clicks
  useEffect(() => {
    const container = editorContainerRef.current;
    if (!container) return;
    const handler = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest("[data-wikilink]");
      if (target instanceof HTMLElement) {
        const name = target.getAttribute("data-wikilink");
        if (name) onWikiLinkClick(name);
      }
    };
    container.addEventListener("click", handler);
    return () => container.removeEventListener("click", handler);
  }, [onWikiLinkClick]);

  const editor = useEditor({
    immediatelyRender: false,  // required for Next.js SSR — prevents hydration mismatch
    extensions: [
      StarterKit,
      WikiLinkExtension,
      Markdown.configure({
        html: false,
        tightLists: true,
        transformPastedText: true,  // paste markdown → rich text nodes
        transformCopiedText: true,  // copy selection → plain markdown
      }),
      Placeholder.configure({ placeholder: "Begin your story…" }),
      Typography,
      CharacterCount,
    ],
    content: "",         // populated in useEffect once editor is ready
    editable: false,     // start in read mode
    editorProps: {
      attributes: {
        class: "tiptap prose prose-lg dark:prose-invert max-w-none focus:outline-none font-serif",
        spellCheck: "true",
      },
    },
    onUpdate({ editor }) {
      if (!editor.isEditable) return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const md = (editor.storage as any).markdown.getMarkdown() as string;
      latestMd.current = md;
      autosave(md);
    },
  });

  // Load initial content once the editor instance is ready
  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    editor.commands.setContent(initialContent, { emitUpdate: false });
    latestMd.current = initialContent;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor]);

  // Sync editMode → TipTap editable flag
  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    editor.setEditable(editMode);
    if (editMode) {
      // Focus without moving the cursor — preserve position, or start at beginning
      setTimeout(() => editor.commands.focus(), 10);
    }
  }, [editor, editMode]);

  // Load reader preferences on mount
  useEffect(() => {
    const prefs = loadReaderPrefs();
    setFontSize(prefs.fontSize);
    setReadingTheme(prefs.readingTheme);
  }, []);

  // Reset reading theme when global light/dark mode changes if the stored theme
  // is incompatible (sepia is light-only; warm is dark-only).
  useEffect(() => {
    setReadingTheme((current) => {
      if (resolvedTheme === "dark"  && current === "sepia") return "default";
      if (resolvedTheme === "light" && current === "warm")  return "default";
      return current;
    });
  }, [resolvedTheme]);

  // Check for a newer local draft on mount
  useEffect(() => {
    const draft = loadDraft(novelId, chapterSlug);
    if (draft && draft.savedAt > fetchedAt) {
      setDraftDate(draft.savedAt);
      setShowRestore(true);
    }
  }, [novelId, chapterSlug, fetchedAt]);

  const handleSync = useCallback(async () => {
    if (syncInFlightRef.current) return;
    syncInFlightRef.current = true;
    setSyncState("syncing");
    startLoading("Syncing to GitHub…", "Please don't close this page.");
    try {
      await syncChapter(novelId, chapterSlug, latestMd.current);
      clearDraft(novelId, chapterSlug);
      setSyncState("success");
    } catch {
      setSyncState("error");
    } finally {
      stopLoading();
      syncInFlightRef.current = false;
    }
  }, [novelId, chapterSlug, startLoading, stopLoading]);

  // Keyboard shortcuts
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        if (!syncInFlightRef.current) void handleSync();
      }
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === "r") {
        e.preventDefault();
        setEditMode((m) => !m);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleSync]);

  if (!editor) return null;

  return (
    <div ref={editorContainerRef} className="flex flex-col flex-1 overflow-hidden min-w-0">
      <EditorToolbar
        editor={editor}
        editMode={editMode}
        onToggleEdit={() => setEditMode((m) => !m)}
        syncState={syncState}
        onSync={handleSync}
        sidebarOpen={sidebarOpen}
        onToggleSidebar={onToggleSidebar}
        fontSize={fontSize}
        onFontSizeChange={(s) => { setFontSize(s); saveReaderPrefs({ fontSize: s, readingTheme }); }}
        readingTheme={readingTheme}
        onReadingThemeChange={(t) => { setReadingTheme(t); saveReaderPrefs({ fontSize, readingTheme: t }); }}
        resolvedTheme={resolvedTheme}
        loreSidebarOpen={loreSidebarOpen}
        onToggleLore={onToggleLore}
        aiSidebarOpen={aiSidebarOpen}
        onToggleAi={onToggleAi}
        bibleSidebarOpen={bibleSidebarOpen}
        onToggleBible={onToggleBible}
      />

      {/* Scrollable document area */}
      <div
        className="flex-1 overflow-y-auto"
        data-reading-theme={readingTheme}
        style={{
          background: "var(--bg-editor)",
          "--reader-font-size": { sm: "16px", md: "19px", lg: "22px", xl: "26px" }[fontSize],
        } as React.CSSProperties}
        // Only focus-end when clicking the *padding area* below the text,
        // not when clicking inside the editor itself (those events bubble up).
        onClick={(e) => {
          if (editMode && editor && e.target === e.currentTarget) {
            editor.commands.focus("end");
          }
        }}
      >
        <div
          className={cn(
            "max-w-[var(--editor-max-width)] mx-auto px-3 sm:px-6 md:px-8",
            !editMode && chapterOrder.length > 0
              ? "pt-16 pb-[max(7rem,calc(env(safe-area-inset-bottom,0px)+5.5rem))] sm:pb-32"
              : "py-16",
          )}
        >
          <EditorContent editor={editor} />
        </div>
      </div>

      {!editMode && chapterOrder.length > 0 && (
        <ChapterReadNav
          novelId={novelId}
          chapterSlug={chapterSlug}
          chapterOrder={chapterOrder}
          syncState={syncState}
        />
      )}

      <DraftRestoreDialog
        open={showRestore}
        draftDate={draftDate}
        onRestore={() => {
          const draft = loadDraft(novelId, chapterSlug);
          if (draft && editor) {
            editor.commands.setContent(draft.content, { emitUpdate: false });
            latestMd.current = draft.content;
          }
          setShowRestore(false);
        }}
        onDiscard={() => {
          clearDraft(novelId, chapterSlug);
          setShowRestore(false);
        }}
      />

      <SyncStatusBanner state={syncState} onRetry={handleSync} />
    </div>
  );
}
