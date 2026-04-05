"use client";

import { useCallback, useEffect, useState } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { markdown } from "@codemirror/lang-markdown";
import { useDebouncedCallback } from "use-debounce";
import { saveDraft, loadDraft, clearDraft } from "@/lib/local-draft";
import { syncChapter } from "@/app/(editor)/edit/[novelId]/[chapterSlug]/actions";
import { DraftRestoreDialog } from "./draft-restore-dialog";
import { SyncStatusBanner } from "./sync-status-banner";
import { ReaderPane } from "./reader-pane";
import { countWords } from "@/lib/word-count";

interface Props {
  novelId:        string;
  chapterSlug:    string;
  initialContent: string;
  fetchedAt:      string; // ISO — when the GitHub version was fetched
}

type SyncState = "idle" | "syncing" | "success" | "error";

export function EditorClient({ novelId, chapterSlug, initialContent, fetchedAt }: Props) {
  const [value, setValue]             = useState(initialContent);
  const [syncState, setSyncState]     = useState<SyncState>("idle");
  const [showRestore, setShowRestore] = useState(false);
  const [draftDate, setDraftDate]     = useState("");
  const [readerMode, setReaderMode]   = useState(false);
  const wordCount                     = countWords(value);

  // On mount: check for newer local draft
  useEffect(() => {
    const draft = loadDraft(novelId, chapterSlug);
    if (draft && draft.savedAt > fetchedAt) {
      setDraftDate(draft.savedAt);
      setShowRestore(true);
    }
  }, [novelId, chapterSlug, fetchedAt]);

  const autosave = useDebouncedCallback((content: string) => {
    saveDraft(novelId, chapterSlug, content);
  }, 1500);

  const handleChange = useCallback((val: string) => {
    setValue(val);
    autosave(val);
  }, [autosave]);

  async function handleSync() {
    setSyncState("syncing");
    try {
      await syncChapter(novelId, chapterSlug, value);
      clearDraft(novelId, chapterSlug);
      setSyncState("success");
    } catch {
      setSyncState("error");
    }
  }

  // Cmd+S shortcut
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        handleSync();
      }
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === "r") {
        e.preventDefault();
        setReaderMode((m) => !m);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-6 py-2 border-b border-[var(--border-default)] text-sm text-[var(--text-muted)]">
        <span>{wordCount} words</span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setReaderMode((m) => !m)}
            className="px-3 py-1 rounded-md border border-[var(--border-default)] text-sm hover:bg-[var(--bg-sidebar)]"
            aria-pressed={readerMode}
          >
            {readerMode ? "Edit" : "Read"}
          </button>
          <button
            onClick={handleSync}
            disabled={syncState === "syncing"}
            className="px-3 py-1 rounded-md bg-[var(--accent)] text-white text-sm hover:bg-[var(--accent-hover)] disabled:opacity-50"
          >
            {syncState === "syncing" ? "Syncing…" : "Sync to GitHub"}
          </button>
        </div>
      </div>

      {/* Editor / Reader */}
      <div
        className="flex-1 overflow-y-auto transition-opacity duration-150"
        style={{ opacity: 1 }}
      >
        {readerMode ? (
          <ReaderPane content={value} />
        ) : (
          <div className="max-w-[var(--editor-max-width)] mx-auto py-20 px-4">
            <CodeMirror
              value={value}
              onChange={handleChange}
              extensions={[markdown()]}
              basicSetup={{
                lineNumbers:         false,
                foldGutter:          false,
                highlightActiveLine: false,
              }}
              style={{ fontFamily: "var(--font-serif)", fontSize: "19px", lineHeight: "1.8" }}
            />
          </div>
        )}
      </div>

      <DraftRestoreDialog
        open={showRestore}
        draftDate={draftDate}
        onRestore={() => {
          const draft = loadDraft(novelId, chapterSlug);
          if (draft) setValue(draft.content);
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
