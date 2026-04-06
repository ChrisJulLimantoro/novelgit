"use client";

import { useEffect, useState } from "react";

type SyncState = "idle" | "syncing" | "success" | "error";

interface Props {
  state: SyncState;
  onRetry?: () => void;
}

export function SyncStatusBanner({ state, onRetry }: Props) {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (state !== "success") { setSeconds(0); return; }
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [state]);

  if (state === "idle") return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-0 inset-x-0 z-30 h-10 flex items-center justify-center text-sm
                 bg-[var(--bg-elevated)] border-t border-[var(--border-default)]
                 animate-[slideUp_200ms_ease-out]"
    >
      {state === "syncing" && (
        <span className="flex items-center gap-2">
          <span className="animate-spin h-3 w-3 border-2 border-current border-t-transparent rounded-full" />
          Syncing…
        </span>
      )}
      {state === "success" && (
        <span className="text-[var(--status-writing)]">
          Saved to GitHub.{seconds > 0 && ` ${seconds}s ago`}
        </span>
      )}
      {state === "error" && (
        <span className="flex items-center gap-3 text-destructive">
          Sync failed.
          {onRetry && <button onClick={onRetry} className="underline">Retry</button>}
        </span>
      )}
    </div>
  );
}
