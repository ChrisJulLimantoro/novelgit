"use client";

import { useState } from "react";
import { Download, FileText, FileType2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useGlobalLoader } from "@/components/ui/global-loader";

interface Props {
  novelId: string;
  novelTitle: string;
}

type Format = "pdf" | "docx";

export function ExportButton({ novelId, novelTitle }: Props) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const { startLoading, stopLoading } = useGlobalLoader();

  async function handleExport(format: Format) {
    setOpen(false);
    setError("");
    const label = format === "pdf" ? "Generating PDF…" : "Generating DOCX…";
    startLoading(label, "Fetching chapters and building your document.");
    try {
      const res = await fetch(`/api/export/${novelId}?format=${format}`);
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || res.statusText);
      }
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      a.download = `${novelTitle}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Export failed.");
    } finally {
      stopLoading();
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => { setOpen((o) => !o); setError(""); }}
        className="inline-flex items-center gap-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
      >
        <Download size={12} />
        Export
      </button>

      {open && (
        <>
          {/* Click-outside dismiss */}
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-6 z-20 flex flex-col overflow-hidden rounded-lg border border-[var(--border-default)] bg-[var(--bg-elevated)] shadow-lg min-w-[140px]">
            <button
              type="button"
              onClick={() => void handleExport("pdf")}
              className={cn(
                "flex items-center gap-2.5 px-3 py-2.5 text-xs text-[var(--text-primary)]",
                "hover:bg-[var(--bg-sidebar)] transition-colors",
              )}
            >
              <FileType2 size={13} className="text-[var(--text-muted)] shrink-0" />
              Export as PDF
            </button>
            <button
              type="button"
              onClick={() => void handleExport("docx")}
              className={cn(
                "flex items-center gap-2.5 px-3 py-2.5 text-xs text-[var(--text-primary)]",
                "hover:bg-[var(--bg-sidebar)] transition-colors border-t border-[var(--border-default)]",
              )}
            >
              <FileText size={13} className="text-[var(--text-muted)] shrink-0" />
              Export as DOCX
            </button>
          </div>
        </>
      )}

      {error && (
        <div className="absolute left-0 top-6 z-20 flex items-start gap-2 rounded-lg border border-destructive/40 bg-[var(--bg-elevated)] px-3 py-2.5 shadow-lg max-w-[240px]">
          <p className="text-xs text-destructive flex-1">{error}</p>
          <button onClick={() => setError("")} className="shrink-0 text-[var(--text-muted)] hover:text-[var(--text-primary)]">
            <X size={11} />
          </button>
        </div>
      )}
    </div>
  );
}
