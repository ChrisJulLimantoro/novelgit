"use client";

import { useState, useTransition } from "react";
import { Loader2, Save, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { saveAiConfig } from "@/app/(main)/admin/actions";
import {
  GEMINI_TEXT_MODELS,
  GEMINI_EMBEDDING_MODELS,
} from "@/types/ai-config";
import type { AiConfig } from "@/types/ai-config";

interface Props {
  initial: AiConfig;
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium text-[var(--text-primary)]">{label}</label>
      {children}
      {hint && <p className="text-[11px] text-[var(--text-muted)]">{hint}</p>}
    </div>
  );
}

function ModelSelect({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: readonly { id: string; label: string; note: string }[];
}) {
  const isPreset = options.some((o) => o.id === value);
  return (
    <div className="flex flex-col gap-1.5">
      <select
        value={isPreset ? value : "__custom__"}
        onChange={(e) => {
          if (e.target.value !== "__custom__") onChange(e.target.value);
        }}
        className="h-8 rounded-md border border-[var(--border-default)] bg-[var(--bg-elevated)] px-2.5 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] transition-colors"
      >
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.label} — {o.note}
          </option>
        ))}
        <option value="__custom__">Custom model ID…</option>
      </select>
      {/* Always show the raw text input so custom IDs are always visible/editable */}
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="e.g. gemini-2.0-flash"
        className="h-8 rounded-md border border-[var(--border-default)] bg-[var(--bg-elevated)] px-2.5 text-xs font-mono text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] transition-colors"
      />
    </div>
  );
}

export function AiSettingsEditor({ initial }: Props) {
  const [cfg, setCfg]             = useState<AiConfig>(initial);
  const [saved, setSaved]         = useState(false);
  const [saveError, setSaveError] = useState("");
  const [isSaving, startSave]     = useTransition();

  function set<K extends keyof AiConfig>(key: K, value: AiConfig[K]) {
    setCfg((c) => ({ ...c, [key]: value }));
    setSaved(false);
  }

  function handleSave() {
    setSaveError("");
    setSaved(false);
    startSave(async () => {
      try {
        await saveAiConfig(cfg);
        setSaved(true);
      } catch (e) {
        setSaveError(e instanceof Error ? e.message : "Save failed");
      }
    });
  }

  const embeddingWarning =
    cfg.embeddingProvider !== initial.embeddingProvider
      ? "⚠ Changing embedding provider requires a full reindex — existing vectors will be incompatible."
      : "";

  return (
    <div className="flex flex-col gap-8">

      {/* ── Gemini Text Models ──────────────────────────────────────── */}
      <section className="flex flex-col gap-5">
        <div>
          <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-0.5">
            Gemini Text Models
          </h2>
          <p className="text-xs text-[var(--text-muted)]">
            Used for chapter distillation and Global Bible generation during reindex.
            Requires <code className="font-mono">GEMINI_API_KEY</code>.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field
            label="Chapter Distillation"
            hint="1 call per chapter · runs every reindex"
          >
            <ModelSelect
              value={cfg.distillationModel}
              onChange={(v) => set("distillationModel", v)}
              options={GEMINI_TEXT_MODELS}
            />
          </Field>

          <Field
            label="Bible Full Rebuild"
            hint="1 call per full reindex · needs large context"
          >
            <ModelSelect
              value={cfg.bibleRebuildModel}
              onChange={(v) => set("bibleRebuildModel", v)}
              options={GEMINI_TEXT_MODELS}
            />
          </Field>

          <Field
            label="Bible Incremental Patch"
            hint="1 call per single-chapter reindex"
          >
            <ModelSelect
              value={cfg.biblePatchModel}
              onChange={(v) => set("biblePatchModel", v)}
              options={GEMINI_TEXT_MODELS}
            />
          </Field>
        </div>

        {/* Rate limit quick-ref */}
        <div className="flex items-start gap-2 rounded-lg border border-[var(--border-default)] bg-[var(--bg-elevated)] px-3 py-2.5">
          <Info size={13} className="text-[var(--text-muted)] mt-0.5 shrink-0" />
          <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
            Update these model IDs to match any new Gemini releases — paste the exact API model ID
            string (e.g. <code className="font-mono">gemini-2.5-flash-lite</code>) from the Google AI docs.
            Limits shown are approximate free-tier values and may change.
          </p>
        </div>
      </section>

      {/* ── Embedding Provider ──────────────────────────────────────── */}
      <section className="flex flex-col gap-4">
        <div>
          <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-0.5">
            Embedding Provider
          </h2>
          <p className="text-xs text-[var(--text-muted)]">
            Gemini Embedding 2 scores higher on MTEB benchmarks and consolidates to one API key.
            Switching requires a full reindex (existing vectors become incompatible).
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {(["current", "gemini"] as const).map((provider) => (
            <button
              key={provider}
              type="button"
              onClick={() => set("embeddingProvider", provider)}
              className={cn(
                "flex flex-col gap-1 rounded-lg border px-4 py-3 text-left transition-colors",
                cfg.embeddingProvider === provider
                  ? "border-[var(--accent)] bg-[var(--accent)]/5"
                  : "border-[var(--border-default)] hover:border-[var(--text-muted)]",
              )}
            >
              <span className="text-xs font-semibold text-[var(--text-primary)]">
                {provider === "current" ? "Voyage + Nemotron (current)" : "Gemini Embedding 2"}
              </span>
              <span className="text-[11px] text-[var(--text-muted)]">
                {provider === "current"
                  ? "Voyage voyage-3 (1024d) for lore · OpenRouter Nemotron (2048d) for manuscript"
                  : "MTEB #1 · 3072d → 1024d lore / 2048d manuscript via Matryoshka · 1K RPD free"}
              </span>
            </button>
          ))}
        </div>

        {cfg.embeddingProvider === "gemini" && (
          <Field label="Gemini Embedding Model" hint="Default: gemini-embedding-001 (GA)">
            <ModelSelect
              value={cfg.geminiEmbeddingModel}
              onChange={(v) => set("geminiEmbeddingModel", v)}
              options={GEMINI_EMBEDDING_MODELS}
            />
          </Field>
        )}

        {embeddingWarning && (
          <p className="text-[11px] text-amber-600 dark:text-amber-400">{embeddingWarning}</p>
        )}
      </section>

      {/* ── Save ───────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 pt-2 border-t border-[var(--border-default)]">
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-2 px-4 py-2 rounded-md bg-[var(--accent)] text-white text-sm hover:bg-[var(--accent-hover)] disabled:opacity-50 transition-colors"
        >
          {isSaving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
          {isSaving ? "Saving…" : "Save Settings"}
        </button>
        {saved && <span className="text-xs text-emerald-600 dark:text-emerald-400">Saved ✓</span>}
        {saveError && <span className="text-xs text-destructive">{saveError}</span>}
      </div>
    </div>
  );
}
