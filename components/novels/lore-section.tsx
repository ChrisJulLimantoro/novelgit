"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, Plus, Scroll } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LoreTypeIcon } from "@/components/lore/lore-type-icon";
import { cn } from "@/lib/utils";
import type { LoreType } from "@/types/lore";

export type LorePreviewEntry = {
  id:   string;
  type: LoreType;
  name: string;
};

interface Props {
  novelId:    string;
  entries:    LorePreviewEntry[];
  totalCount: number;
}

export function LoreSection({ novelId, entries, totalCount }: Props) {
  const [open, setOpen] = useState(true);

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
            World-Building {totalCount > 0 && `· ${totalCount}`}
          </span>
        </button>

        <Button
          render={<Link href={`/library/${novelId}/lore`} />}
          size="sm"
          variant="outline"
          nativeButton={false}
        >
          <Plus size={13} />
          Manage Lore
        </Button>
      </div>

      {/* Collapsible body */}
      {open && (
        entries.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-8 text-center border border-dashed border-[var(--border-default)] rounded-xl">
            <Scroll size={28} className="text-[var(--text-muted)] opacity-30" />
            <p className="text-sm text-[var(--text-muted)]">No lore entries yet.</p>
            <Link
              href={`/library/${novelId}/lore`}
              className="text-xs text-[var(--accent)] hover:underline"
            >
              Start building your world →
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-0.5 mb-2">
            {entries.map((entry) => (
              <Link
                key={entry.id}
                href={`/library/${novelId}/lore?entry=${entry.id}`}
                className="flex items-center gap-2.5 px-4 py-2.5 rounded-lg hover:bg-[var(--bg-sidebar)] transition-colors group"
              >
                <LoreTypeIcon type={entry.type} size={13} className="text-[var(--text-muted)] shrink-0" />
                <span className="text-sm text-[var(--text-primary)] flex-1 capitalize truncate">{entry.name}</span>
                <span className="text-[10px] text-[var(--text-muted)] capitalize opacity-0 group-hover:opacity-100 transition-opacity">
                  {entry.type}
                </span>
              </Link>
            ))}
            {totalCount > 5 && (
              <Link
                href={`/library/${novelId}/lore`}
                className="text-xs text-[var(--text-muted)] hover:text-[var(--accent)] px-4 py-2 transition-colors"
              >
                +{totalCount - 5} more entries →
              </Link>
            )}
          </div>
        )
      )}
    </div>
  );
}
