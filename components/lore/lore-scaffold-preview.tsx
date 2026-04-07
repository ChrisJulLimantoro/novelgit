"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Button } from "@/components/ui/button";

interface Props {
  markdown:  string;
  onChange:  (md: string) => void;
  onAccept:  (md: string) => void;
  onReject:  () => void;
}

export function LoreScaffoldPreview({ markdown, onChange, onAccept, onReject }: Props) {
  return (
    <div className="rounded-lg border border-[var(--accent)]/40 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-[var(--accent)]/5 border-b border-[var(--accent)]/20">
        <span className="text-xs font-medium text-[var(--accent)]">AI Scaffold Preview</span>
        <div className="flex gap-2">
          <Button size="xs" variant="ghost" onClick={onReject}>
            Discard
          </Button>
          <Button size="xs" onClick={() => onAccept(markdown)}>
            Use this ✓
          </Button>
        </div>
      </div>

      {/* Side-by-side */}
      <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-[var(--border-default)]">
        {/* Raw — editable */}
        <textarea
          value={markdown}
          onChange={(e) => onChange(e.target.value)}
          className="w-full p-3 text-xs font-mono bg-[var(--bg-elevated)] text-[var(--text-primary)] resize-none min-h-56 max-h-72 overflow-y-auto outline-none"
          spellCheck={false}
        />
        {/* Rendered preview */}
        <div className="p-3 overflow-y-auto max-h-72 bg-[var(--bg-elevated)]">
          <div className="prose prose-sm max-w-none dark:prose-invert text-[var(--text-primary)]">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdown}</ReactMarkdown>
          </div>
        </div>
      </div>
    </div>
  );
}
