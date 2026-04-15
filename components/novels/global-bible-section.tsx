"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { ChevronDown, BookMarked, Pencil, Loader2, Sparkles, RefreshCw, NotebookPen } from "lucide-react";
import { Button } from "@/components/ui/button";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";
import { loadGlobalBible } from "@/app/(main)/library/[novelId]/actions";

type ReindexState  = "idle" | "busy" | "ok" | "warn" | "err";
type ActiveReindex = "full" | "bible" | "distill" | null;

interface Props {
  novelId:      string;
  initialBible: string;
}

export function GlobalBibleSection({ novelId, initialBible }: Props) {
  const [open, setOpen]                   = useState(true);
  const [bible, setBible]                 = useState(initialBible);
  const [reindexState,  setReindexState]  = useState<ReindexState>("idle");
  const [activeReindex, setActiveReindex] = useState<ActiveReindex>(null);
  const [reindexNote,   setReindexNote]   = useState("");
  const [, startTransition]               = useTransition();

  async function runReindex(mode: "full" | "bible" | "distill") {
    if (reindexState === "busy") return;
    setReindexState("busy");
    setActiveReindex(mode);
    setReindexNote("");
    let next: ReindexState = "err";
    try {
      const res = await fetch(`/api/ai/${novelId}/reindex?mode=${mode}`, { method: "POST" });
      const raw = await res.text();
      if (!res.ok) {
        setReindexNote(raw.slice(0, 120) || res.statusText);
      } else {
        const data = JSON.parse(raw) as {
          reindexed?: number;
          manuscriptChunks?: number;
          manuscriptError?: string;
          globalBibleGenerated?: boolean;
          distilled?: number;
          distillErrors?: Record<string, string>;
          error?: string;
        };
        if (data.error) {
          next = "err";
          setReindexNote(data.error.slice(0, 120));
        } else if (mode === "distill" && data.distillErrors && Object.keys(data.distillErrors).length > 0) {
          next = "warn";
          setReindexNote(
            `Some chapters failed — distilled ${data.distilled ?? 0} · check server logs`,
          );
        } else if (data.manuscriptError) {
          next = "warn";
          setReindexNote(`Partial error — lore: ${data.reindexed ?? 0}`);
        } else {
          next = "ok";
          if (mode === "bible") {
            setReindexNote("Bible rebuilt");
          } else if (mode === "distill") {
            const n = data.distilled ?? 0;
            const bibleOk = data.globalBibleGenerated;
            setReindexNote(
              bibleOk
                ? `Done — ${n} chapter${n === 1 ? "" : "s"} resummarized · Global Bible updated`
                : `Summaries updated (${n}) — Global Bible skipped`,
            );
          } else {
            setReindexNote(`Done — lore: ${data.reindexed ?? 0} · chunks: ${data.manuscriptChunks ?? 0}`);
          }
        }
        const shouldRefreshBible =
          !data.error &&
          (mode === "bible" ||
            mode === "distill" ||
            (mode === "full" && !data.manuscriptError));
        if (shouldRefreshBible) {
          startTransition(async () => {
            const fresh = await loadGlobalBible(novelId).catch(() => bible);
            setBible(fresh);
          });
        }
      }
    } catch {
      setReindexNote("Network error");
    }
    setReindexState(next);
    setActiveReindex(null);
    setTimeout(() => { setReindexState("idle"); setReindexNote(""); }, 10000);
  }

  async function handleRefresh() {
    const fresh = await loadGlobalBible(novelId).catch(() => bible);
    setBible(fresh);
  }

  return (
    <div>
      {/* Header row */}
      <div className="flex items-center justify-between mb-4">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-1.5 group"
        >
          <ChevronDown
            size={13}
            className={cn(
              "text-[var(--text-muted)] transition-transform duration-200",
              !open && "-rotate-90",
            )}
          />
          <span className="font-sans text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition-colors">
            Global Bible
          </span>
        </button>

        <div className="flex flex-wrap items-center justify-end gap-2">
          {/* Rebuild Bible — cheap: 1 Gemini call, uses existing summaries */}
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => void runReindex("bible")}
            disabled={reindexState === "busy"}
            title="Rebuild Global Bible from existing chapter summaries (fast)"
            className={cn(
              "text-[0.8rem] font-medium",
              reindexState === "ok"   && activeReindex === null && "border-emerald-500/40 text-emerald-600 dark:text-emerald-400",
              reindexState === "warn" && activeReindex === null && "border-amber-500/40 text-amber-600 dark:text-amber-400",
              reindexState === "err"  && activeReindex === null && "border-destructive/40 text-destructive",
              (reindexState === "idle" || activeReindex !== null) &&
                "text-[var(--text-muted)] hover:text-[var(--text-primary)]",
            )}
          >
            {reindexState === "busy" && activeReindex === "bible"
              ? <Loader2 size={13} className="animate-spin" />
              : <RefreshCw size={13} />
            }
            {reindexState === "busy" && activeReindex === "bible" ? "Rebuilding…" : "Rebuild Bible"}
          </Button>

          {/* Resummarize all chapters + Global Bible — no re-embedding */}
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => void runReindex("distill")}
            disabled={reindexState === "busy"}
            title="Re-run Gemini on every chapter and rebuild the Global Bible. Does not re-embed vectors."
            className={cn(
              "text-[0.8rem] font-medium",
              reindexState === "ok"   && activeReindex === null && "border-emerald-500/40 text-emerald-600 dark:text-emerald-400",
              reindexState === "warn" && activeReindex === null && "border-amber-500/40 text-amber-600 dark:text-amber-400",
              reindexState === "err"  && activeReindex === null && "border-destructive/40 text-destructive",
              (reindexState === "idle" || activeReindex !== null) &&
                "text-[var(--text-muted)] hover:text-[var(--text-primary)]",
            )}
          >
            {reindexState === "busy" && activeReindex === "distill"
              ? <Loader2 size={13} className="animate-spin" />
              : <NotebookPen size={13} />
            }
            {reindexState === "busy" && activeReindex === "distill" ? "Resummarizing…" : "Resummarize all"}
          </Button>

          {/* Full Reindex — expensive: re-embeds all chapters + distills + bible */}
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => void runReindex("full")}
            disabled={reindexState === "busy"}
            title="Full reindex — re-embed all chapters, distill summaries, rebuild Global Bible"
            className={cn(
              "text-[0.8rem] font-medium",
              reindexState === "ok"   && activeReindex === null && "border-emerald-500/40 text-emerald-600 dark:text-emerald-400",
              reindexState === "warn" && activeReindex === null && "border-amber-500/40 text-amber-600 dark:text-amber-400",
              reindexState === "err"  && activeReindex === null && "border-destructive/40 text-destructive",
              (reindexState === "idle" || activeReindex !== null) &&
                "border-[var(--accent)]/30 text-[var(--accent)] hover:border-[var(--accent)]/60 hover:bg-[var(--accent)]/5",
            )}
          >
            {reindexState === "busy" && activeReindex === "full"
              ? <Loader2 size={13} className="animate-spin" />
              : <Sparkles size={13} />
            }
            {reindexState === "busy" && activeReindex === "full" ? "Reindexing…" : "Reindex"}
          </Button>

          <Button
            render={<Link href={`/edit/${novelId}/bible`} />}
            size="sm"
            variant="outline"
            nativeButton={false}
          >
            <Pencil size={13} />
            Edit
          </Button>
        </div>
      </div>

      {/* Reindex feedback */}
      {reindexNote && (
        <p className={cn(
          "text-[10px] mb-3 leading-snug",
          reindexState === "ok"   && "text-emerald-600 dark:text-emerald-400",
          reindexState === "warn" && "text-amber-600 dark:text-amber-400",
          reindexState === "err"  && "text-destructive",
        )}>
          {reindexNote}
        </p>
      )}

      {/* Collapsible body */}
      {open && (
        bible ? (
          <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-elevated)] px-4 py-3">
            <div className="prose prose-sm max-w-none dark:prose-invert text-[var(--text-primary)] max-h-[24rem] overflow-y-auto overflow-x-auto pr-2">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{bible}</ReactMarkdown>
            </div>
            <button
              type="button"
              onClick={handleRefresh}
              className="mt-2 text-xs text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors"
            >
              ↻ Refresh
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 py-8 text-center border border-dashed border-[var(--border-default)] rounded-xl">
            <BookMarked size={28} className="text-[var(--text-muted)] opacity-30" />
            <p className="text-sm text-[var(--text-muted)]">No Global Bible yet.</p>
            <p className="text-xs text-[var(--text-muted)] max-w-[260px]">
              Run a full reindex to auto-generate one, or click Edit to write it manually.
            </p>
          </div>
        )
      )}
    </div>
  );
}
