"use client";

import {
  createContext, useCallback, useContext, useEffect, useRef, useState,
} from "react";
import { createPortal } from "react-dom";
import { Loader2 } from "lucide-react";

interface LoaderState {
  visible:   boolean;
  label:     string;
  sublabel?: string;
}

interface GlobalLoaderContextValue {
  startLoading: (label: string, sublabel?: string) => void;
  stopLoading:  () => void;
}

const GlobalLoaderContext = createContext<GlobalLoaderContextValue | null>(null);

export function GlobalLoaderProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<LoaderState>({ visible: false, label: "" });
  const [mounted, setMounted] = useState(false);
  // Track nested calls so stop only hides when all callers are done
  const depth = useRef(0);

  useEffect(() => setMounted(true), []);

  const startLoading = useCallback((label: string, sublabel?: string) => {
    depth.current += 1;
    setState({ visible: true, label, sublabel });
  }, []);

  const stopLoading = useCallback(() => {
    depth.current = Math.max(0, depth.current - 1);
    if (depth.current === 0) {
      setState((s) => ({ ...s, visible: false }));
    }
  }, []);

  return (
    <GlobalLoaderContext.Provider value={{ startLoading, stopLoading }}>
      {children}
      {mounted && state.visible && createPortal(
        <div
          role="alertdialog"
          aria-modal="true"
          aria-label={state.label}
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm"
        >
          <div className="flex flex-col items-center gap-4 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-elevated)] px-10 py-7 shadow-2xl min-w-[220px]">
            <Loader2 size={30} className="animate-spin text-[var(--accent)]" />
            <div className="text-center">
              <p className="text-sm font-semibold text-[var(--text-primary)]">{state.label}</p>
              {state.sublabel && (
                <p className="mt-1 text-xs text-[var(--text-muted)]">{state.sublabel}</p>
              )}
            </div>
          </div>
        </div>,
        document.body,
      )}
    </GlobalLoaderContext.Provider>
  );
}

export function useGlobalLoader() {
  const ctx = useContext(GlobalLoaderContext);
  if (!ctx) throw new Error("useGlobalLoader must be used inside GlobalLoaderProvider");
  return ctx;
}
