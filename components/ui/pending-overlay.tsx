"use client";

import { Loader2 } from "lucide-react";

interface Props {
  label: string;
}

/**
 * Section-level dim overlay. Place inside any `relative`-positioned container
 * to block interaction with that section while an async operation is in-flight.
 */
export function PendingOverlay({ label }: Props) {
  return (
    <div
      aria-live="polite"
      className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-[var(--bg-elevated)]/75 backdrop-blur-[2px]"
    >
      <span className="flex items-center gap-2 rounded-lg border border-[var(--border-default)] bg-[var(--bg-elevated)] px-4 py-2.5 text-xs font-medium text-[var(--text-primary)] shadow-sm">
        <Loader2 size={13} className="animate-spin text-[var(--accent)]" />
        {label}
      </span>
    </div>
  );
}
