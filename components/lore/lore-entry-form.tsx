"use client";

import { useState, useTransition, useRef } from "react";
import { Sparkles, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { LoreScaffoldPreview } from "./lore-scaffold-preview";
import { LoreTypeIcon } from "./lore-type-icon";
import { LORE_TYPE_LABELS } from "@/lib/lore-categories";
import { createLoreEntry, updateLoreEntry } from "@/app/(main)/library/[novelId]/lore/actions";
import { LORE_TYPES } from "@/types/lore";
import type { LoreType, LoreEntry } from "@/types/lore";

interface Props {
  novelId:     string;
  initial?:    LoreEntry;
  /** Create only: lock type and skip the type picker. */
  presetType?: LoreType;
  onSuccess:   (slug: string) => void;
  onCancel:    () => void;
}

export function LoreEntryForm({ novelId, initial, presetType, onSuccess, onCancel }: Props) {
  const [name, setName]           = useState(initial?.name ?? "");
  const [type, setType]           = useState<LoreType | "">(initial?.type ?? presetType ?? "");
  const [tags, setTags]           = useState<string[]>(initial?.tags ?? []);
  const [body, setBody]           = useState(initial?.body ?? "");
  const [tagInput, setTagInput]   = useState("");
  const [scaffoldMd, setScaffoldMd] = useState<string | null>(null);
  const [scaffolding, setScaffolding] = useState(false);
  const [scaffoldError, setScaffoldError] = useState("");
  const [saveError, setSaveError] = useState("");
  const [isPending, startTransition] = useTransition();
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  const isEdit = !!initial;
  const typeLocked = !isEdit && !!presetType;
  const canSubmit = name.trim().length > 0 && type !== "";

  function addTag(raw: string) {
    const tag = raw.trim().toLowerCase().replace(/\s+/g, "-");
    if (tag && !tags.includes(tag)) setTags((t) => [...t, tag]);
    setTagInput("");
  }

  function handleTagKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(tagInput);
    }
    if (e.key === "Backspace" && tagInput === "" && tags.length > 0) {
      setTags((t) => t.slice(0, -1));
    }
  }

  async function handleScaffold() {
    if (!type || !name.trim()) return;
    setScaffolding(true);
    setScaffoldError("");
    setScaffoldMd(null);
    try {
      const res = await fetch(`/api/ai/${novelId}/scaffold-lore`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), type, tags }),
      });
      if (!res.ok) throw new Error(await res.text());
      const { markdown } = (await res.json()) as { markdown: string };
      setScaffoldMd(markdown);
    } catch (err) {
      setScaffoldError(err instanceof Error ? err.message : "Failed to generate scaffold.");
    } finally {
      setScaffolding(false);
    }
  }

  function handleAcceptScaffold(md: string) {
    setBody(md);
    setScaffoldMd(null);
    setTimeout(() => bodyRef.current?.focus(), 50);
  }

  function handleSubmit() {
    setSaveError("");
    // Preview keeps markdown in `scaffoldMd` until "Use this ✓"; saving without
    // accepting would otherwise persist an empty body.
    const bodyToSave = scaffoldMd !== null ? scaffoldMd : body;
    startTransition(async () => {
      try {
        if (isEdit && initial) {
          await updateLoreEntry({
            novelId,
            slug:    initial.id,
            name:    name.trim(),
            type:    type as LoreType,
            tags,
            body:    bodyToSave,
            sha:     initial.sha,
          });
          onSuccess(initial.id);
        } else {
          const { slug } = await createLoreEntry({
            novelId,
            name: name.trim(),
            type: type as LoreType,
            tags,
            body: bodyToSave,
          });
          onSuccess(slug);
        }
      } catch (err) {
        setSaveError(err instanceof Error ? err.message : "Failed to save entry.");
      }
    });
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Name */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
          Name
        </label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Anna Kovacs"
          className="h-8 rounded-lg border border-[var(--border-default)] bg-[var(--bg-elevated)] px-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20 transition-colors"
        />
      </div>

      {/* Type */}
      {typeLocked && presetType ? (
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
            Category
          </span>
          <div className="inline-flex items-center gap-2.5 w-fit px-3 py-2 rounded-lg border border-[var(--border-default)] bg-[var(--bg-sidebar)] text-sm text-[var(--text-primary)]">
            <LoreTypeIcon type={presetType} size={16} className="text-[var(--accent)] shrink-0" />
            <span className="font-medium">{LORE_TYPE_LABELS[presetType]}</span>
            <span className="text-[var(--text-muted)] text-xs font-normal">— chosen from the library sidebar</span>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
            Type
          </label>
          <div className="flex flex-wrap gap-2">
            {LORE_TYPES.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                className={cn(
                  "px-3 py-1 rounded-full text-xs border transition-all duration-150 capitalize select-none",
                  type === t
                    ? "bg-[var(--accent)]/10 border-[var(--accent)] text-[var(--accent)] font-medium"
                    : "border-[var(--border-default)] text-[var(--text-muted)] hover:border-[var(--accent)]/50 hover:text-[var(--text-primary)]",
                )}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Tags */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
          Tags <span className="font-normal normal-case tracking-normal">(optional)</span>
        </label>
        <div className="flex flex-wrap gap-1.5 min-h-8 rounded-lg border border-[var(--border-default)] bg-[var(--bg-elevated)] px-2 py-1.5 focus-within:border-[var(--accent)] focus-within:ring-2 focus-within:ring-[var(--accent)]/20 transition-colors">
          {tags.map((tag) => (
            <span
              key={tag}
              className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-[var(--accent)]/10 text-[var(--accent)] font-medium"
            >
              {tag}
              <button
                type="button"
                onClick={() => setTags((t) => t.filter((x) => x !== tag))}
                className="opacity-60 hover:opacity-100 transition-opacity"
              >
                <X size={10} />
              </button>
            </span>
          ))}
          <input
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={handleTagKeyDown}
            onBlur={() => { if (tagInput.trim()) addTag(tagInput); }}
            placeholder={tags.length === 0 ? "protagonist, detective…" : ""}
            className="flex-1 min-w-[80px] bg-transparent text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none"
          />
        </div>
        <p className="text-[10px] text-[var(--text-muted)]">Press Enter or comma to add a tag</p>
      </div>

      {/* Body + Generate button */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
            Description
          </label>
          <button
            type="button"
            onClick={handleScaffold}
            disabled={!canSubmit || scaffolding}
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs transition-colors",
              !canSubmit || scaffolding
                ? "opacity-40 pointer-events-none text-[var(--text-muted)]"
                : "text-[var(--accent)] hover:bg-[var(--accent)]/10",
            )}
          >
            {scaffolding
              ? <><Loader2 size={12} className="animate-spin" /> Generating…</>
              : <><Sparkles size={12} /> Generate with AI</>
            }
          </button>
        </div>

        {scaffoldError && (
          <p className="text-xs text-destructive">{scaffoldError}</p>
        )}

        {scaffoldMd !== null ? (
          <LoreScaffoldPreview
            markdown={scaffoldMd}
            onChange={setScaffoldMd}
            onAccept={handleAcceptScaffold}
            onReject={() => setScaffoldMd(null)}
          />
        ) : (
          <textarea
            ref={bodyRef}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Write markdown here, or generate a scaffold with AI…"
            rows={12}
            className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-elevated)] px-3 py-2.5 text-sm font-mono text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20 transition-colors resize-y"
          />
        )}
      </div>

      {saveError && (
        <p className="text-xs text-destructive">{saveError}</p>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between pt-1">
        <Button variant="ghost" size="sm" onClick={onCancel} disabled={isPending}>
          Cancel
        </Button>
        <Button
          size="sm"
          onClick={handleSubmit}
          disabled={!canSubmit || isPending}
        >
          {isPending
            ? <><Loader2 size={12} className="animate-spin" /> Saving…</>
            : isEdit ? "Save changes" : "Save entry"
          }
        </Button>
      </div>
    </div>
  );
}
