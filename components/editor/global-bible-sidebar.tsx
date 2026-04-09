"use client";

import { useState, useEffect, useTransition } from "react";
import { X, BookMarked, Pencil, Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";
import { loadGlobalBible, saveGlobalBible } from "@/app/(main)/library/[novelId]/actions";

interface Props {
  novelId: string;
  open:    boolean;
  onClose: () => void;
}

type ViewMode = "view" | "edit";

export function GlobalBibleSidebar({ novelId, open, onClose }: Props) {
  const [viewMode, setViewMode]   = useState<ViewMode>("view");
  const [bible, setBible]         = useState("");
  const [draft, setDraft]         = useState("");
  const [loaded, setLoaded]       = useState(false);
  const [saveError, setSaveError] = useState("");
  const [isSaving, startSave]     = useTransition();

  // Load bible when sidebar opens
  useEffect(() => {
    if (!open || loaded) return;
    loadGlobalBible(novelId).then((content) => {
      setBible(content);
      setDraft(content);
      setLoaded(true);
    }).catch(() => setLoaded(true));
  }, [open, loaded, novelId]);

  function handleEdit() {
    setDraft(bible);
    setSaveError("");
    setViewMode("edit");
  }

  function handleCancel() {
    setViewMode("view");
    setSaveError("");
  }

  function handleSave() {
    setSaveError("");
    startSave(async () => {
      try {
        await saveGlobalBible(novelId, draft);
        setBible(draft);
        setViewMode("view");
      } catch (e) {
        setSaveError(e instanceof Error ? e.message : "Save failed");
      }
    });
  }

  if (!open) return null;

  return (
    <div className="fixed inset-y-0 right-0 z-40 flex flex-col w-full sm:w-80 border-l border-[var(--border-default)] bg-[var(--bg-sidebar)] overflow-hidden md:relative md:inset-auto md:z-auto md:w-[300px] md:shrink-0">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-default)] shrink-0">
        <div className="flex items-center gap-2">
          <BookMarked size={14} className="text-[var(--text-muted)]" />
          <span className="text-sm font-semibold text-[var(--text-primary)]">Global Bible</span>
        </div>
        <div className="flex items-center gap-1">
          {viewMode === "view" && loaded && (
            <button
              onClick={handleEdit}
              title="Edit Global Bible"
              className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
            >
              <Pencil size={13} />
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
          >
            <X size={15} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {!loaded ? (
          <div className="flex items-center justify-center h-24">
            <Loader2 size={16} className="animate-spin text-[var(--text-muted)]" />
          </div>
        ) : viewMode === "edit" ? (
          <div className="flex flex-col gap-3 h-full">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Write the Global Bible in markdown…"
              className="flex-1 min-h-[300px] rounded-lg border border-[var(--border-default)] bg-[var(--bg-elevated)] px-3 py-2.5 text-xs font-mono text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20 transition-colors resize-none w-full"
            />
            {saveError && (
              <p className="text-xs text-red-500">{saveError}</p>
            )}
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[var(--accent)] text-white text-xs hover:bg-[var(--accent-hover)] disabled:opacity-50 transition-colors"
              >
                {isSaving && <Loader2 size={11} className="animate-spin" />}
                {isSaving ? "Saving…" : "Save"}
              </button>
              <button
                type="button"
                onClick={handleCancel}
                disabled={isSaving}
                className="px-3 py-1.5 rounded-md text-xs border border-[var(--border-default)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : bible ? (
          <div className="prose prose-xs max-w-none dark:prose-invert text-[var(--text-primary)] overflow-x-auto">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{bible}</ReactMarkdown>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <BookMarked size={28} className="text-[var(--text-muted)] opacity-30" />
            <p className="text-sm text-[var(--text-muted)]">No Global Bible yet.</p>
            <p className="text-xs text-[var(--text-muted)] max-w-[220px]">
              Run a full reindex to generate one, or click the pencil icon to write it.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
