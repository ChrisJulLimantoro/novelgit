"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { X, Send, Trash2, Loader2, Sparkles, Plus, RefreshCw } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";
import type { ChatMessage } from "@/types/lore";
import { useGlobalLoader } from "@/components/ui/global-loader";

interface Props {
  novelId: string;
  open:    boolean;
  onClose: () => void;
}

export function AiSidebar({ novelId, open, onClose }: Props) {
  const [messages, setMessages]         = useState<ChatMessage[]>([]);
  const [streamingContent, setStreamingContent] = useState("");
  const [input, setInput]               = useState("");
  const [streaming, setStreaming]       = useState(false);
  const [streamError, setStreamError]   = useState("");
  const [reindexBusy, setReindexBusy] = useState(false);
  const [reindexNote, setReindexNote] = useState<"ok" | "warn" | "err" | null>(null);
  const [reindexDetail, setReindexDetail] = useState("");
  const bottomRef   = useRef<HTMLDivElement>(null);
  const inputRef    = useRef<HTMLTextAreaElement>(null);
  const abortRef    = useRef<AbortController | null>(null);
  const { startLoading, stopLoading } = useGlobalLoader();

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingContent]);

  async function sendMessage() {
    const text = input.trim();
    if (!text || streaming) return;

    setInput("");
    setStreamError("");

    const userMsg: ChatMessage = { role: "user", content: text };
    const nextMessages = [...messages, userMsg];

    setStreaming(true);
    setStreamingContent("");
    setMessages(nextMessages);

    const ctrl = new AbortController();
    abortRef.current = ctrl;

    // Keep last 40 messages so the server's 50-message cap is never hit
    const window = nextMessages.slice(-40);

    let accumulated = "";
    try {
      const res = await fetch(`/api/ai/${novelId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ messages: window }),
        signal:  ctrl.signal,
      });
      if (!res.ok) throw new Error(await res.text());

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });
        setStreamingContent(accumulated);
      }

      // Stream complete — move into messages as a completed assistant entry
      setMessages((prev) => [...prev, { role: "assistant", content: accumulated }]);
      setStreamingContent("");
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setStreamError("Failed to get a response. Try again.");
        if (accumulated) {
          setMessages((prev) => [...prev, { role: "assistant", content: accumulated }]);
        }
        setStreamingContent("");
      }
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void sendMessage();
    }
  }

  async function runReindex() {
    if (reindexBusy || streaming) return;
    setReindexBusy(true);
    setReindexNote(null);
    setReindexDetail("");
    startLoading("Reindexing RAG…", "Embedding lore and manuscript. This may take a minute.");
    try {
      const res = await fetch(`/api/ai/${novelId}/reindex`, { method: "POST" });
      const raw = await res.text();
      if (!res.ok) {
        setReindexNote("err");
        setReindexDetail(raw.slice(0, 120) || res.statusText);
        return;
      }
      let data: { reindexed?: number; manuscriptChunks?: number; manuscriptError?: string };
      try {
        data = JSON.parse(raw) as typeof data;
      } catch {
        setReindexNote("err");
        setReindexDetail("Invalid response");
        return;
      }

      const lore   = data.reindexed ?? 0;
      const chunks = data.manuscriptChunks ?? 0;
      const msErr  = data.manuscriptError;

      const loreLine = lore === 0
        ? "Lore: none (add entries in Library or set VOYAGE_API_KEY)"
        : `Lore: ${lore} ${lore === 1 ? "entry" : "entries"} embedded`;

      const msLine = msErr
        ? `Manuscript: failed — ${msErr.slice(0, 100)}`
        : chunks === 0
          ? "Manuscript: 0 chunks (set OPENROUTER_API_KEY)"
          : `Manuscript: ${chunks} chunks embedded`;

      setReindexNote(msErr ? "warn" : "ok");
      setReindexDetail(`${loreLine}\n${msLine}`);
    } catch {
      setReindexNote("err");
      setReindexDetail("Network error");
    } finally {
      stopLoading();
      setReindexBusy(false);
    }
  }

  useEffect(() => {
    if (reindexNote !== "ok" && reindexNote !== "warn") return;
    const t = setTimeout(() => {
      setReindexNote(null);
      setReindexDetail("");
    }, 12000);
    return () => clearTimeout(t);
  }, [reindexNote, reindexDetail]);

  if (!open) return null;

  return (
    <div className="fixed inset-y-0 right-0 z-40 flex flex-col w-full sm:w-80 border-l border-[var(--border-default)] bg-[var(--bg-sidebar)] overflow-hidden md:relative md:inset-auto md:z-auto md:w-[300px] md:shrink-0">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-default)] shrink-0">
        <div className="flex items-center gap-2">
          <Sparkles size={13} className="text-[var(--accent)]" />
          <span className="text-sm font-semibold text-[var(--text-primary)]">Ask AI</span>
        </div>
        <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
          <X size={15} />
        </button>
      </div>

      <div className="shrink-0 px-3 py-2 border-b border-[var(--border-default)] flex flex-col gap-1.5">
        <div className="grid grid-cols-2 gap-1.5">
          <Link
            href={`/library/${novelId}/lore`}
            className={cn(
              "flex items-center justify-center gap-1 rounded-lg border border-[var(--border-default)] bg-[var(--bg-elevated)]",
              "px-2 py-1.5 text-[10px] font-medium text-[var(--text-primary)] hover:border-[var(--accent)]/40 transition-colors",
            )}
          >
            <Plus size={11} strokeWidth={2.5} />
            Manage lore
          </Link>
          <button
            type="button"
            onClick={() => void runReindex()}
            disabled={reindexBusy || streaming}
            className={cn(
              "flex items-center justify-center gap-1 rounded-lg border border-[var(--border-default)] bg-[var(--bg-elevated)]",
              "px-2 py-1.5 text-[10px] font-medium text-[var(--text-primary)] hover:border-[var(--accent)]/40 transition-colors",
              "disabled:opacity-45",
            )}
          >
            {reindexBusy ? (
              <Loader2 size={11} className="animate-spin" />
            ) : (
              <RefreshCw size={11} strokeWidth={2.5} />
            )}
            Reindex RAG
          </button>
        </div>
        {reindexNote === "ok" && (
          <p className="text-[10px] text-emerald-600 dark:text-emerald-400 leading-snug whitespace-pre-line break-words">
            {reindexDetail}
          </p>
        )}
        {reindexNote === "warn" && (
          <p className="text-[10px] text-amber-600 dark:text-amber-400 leading-snug whitespace-pre-line break-words">
            {reindexDetail}
          </p>
        )}
        {reindexNote === "err" && (
          <p className="text-[10px] text-destructive leading-snug whitespace-pre-line break-words">{reindexDetail}</p>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-3">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center flex-1 text-center gap-3 py-10">
            <Sparkles size={28} className="text-[var(--text-muted)] opacity-40" />
            <div>
              <p className="text-sm font-medium text-[var(--text-primary)] mb-1">Ask anything about your novel</p>
              <p className="text-xs text-[var(--text-muted)]">
                Answers use <span className="font-medium text-[var(--text-primary)]">lore</span> and <span className="font-medium text-[var(--text-primary)]">manuscript</span> after you run <span className="font-medium text-[var(--text-primary)]">Reindex RAG</span>.
              </p>
            </div>
            <div className="flex flex-col gap-1.5 mt-2 w-full">
              {["Who are the key characters?", "Summarise my world so far", "What conflicts exist?"].map((s) => (
                <button
                  key={s}
                  onClick={() => { setInput(s); setTimeout(() => inputRef.current?.focus(), 50); }}
                  className="text-xs text-left px-3 py-2 rounded-lg border border-[var(--border-default)] text-[var(--text-muted)] hover:border-[var(--accent)]/50 hover:text-[var(--text-primary)] transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg, i) => (
              <div
                key={i}
                className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}
              >
                <div
                  className={cn(
                    "max-w-[88%] rounded-xl px-3 py-2 text-xs leading-relaxed",
                    msg.role === "user"
                      ? "rounded-tr-sm bg-[var(--accent)]/10 text-[var(--text-primary)]"
                      : "rounded-tl-sm bg-[var(--bg-elevated)] text-[var(--text-primary)] border border-[var(--border-default)]",
                  )}
                >
                  {msg.role === "assistant" ? (
                    <div className="prose prose-xs max-w-none dark:prose-invert text-[var(--text-primary)] overflow-x-auto">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                    </div>
                  ) : (
                    msg.content
                  )}
                </div>
              </div>
            ))}
            {streaming && (
              <div className="flex justify-start">
                <div className="max-w-[88%] rounded-xl rounded-tl-sm px-3 py-2 text-xs leading-relaxed bg-[var(--bg-elevated)] text-[var(--text-primary)] border border-[var(--border-default)]">
                  {streamingContent === "" ? (
                    <Loader2 size={12} className="animate-spin text-[var(--text-muted)]" />
                  ) : (
                    <>
                      <span className="whitespace-pre-wrap">{streamingContent}</span>
                      <span className="inline-block w-1 h-3 bg-[var(--text-muted)] animate-pulse ml-0.5 align-middle" />
                    </>
                  )}
                </div>
              </div>
            )}
          </>
        )}
        {streamError && (
          <p className="text-xs text-destructive text-center">{streamError}</p>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="shrink-0 border-t border-[var(--border-default)] px-3 py-2.5 flex flex-col gap-2">
        <div className="flex gap-2 items-end">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about your novel…"
            rows={1}
            disabled={streaming}
            className="flex-1 resize-none rounded-lg border border-[var(--border-default)] bg-[var(--bg-elevated)] px-3 py-2 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] transition-colors disabled:opacity-50 min-h-[32px] max-h-24 overflow-y-auto"
          />
          <button
            onClick={() => void sendMessage()}
            disabled={!input.trim() || streaming}
            className="h-8 w-8 flex items-center justify-center rounded-lg bg-[var(--accent)] text-white disabled:opacity-40 hover:bg-[var(--accent-hover)] transition-colors shrink-0"
          >
            {streaming
              ? <Loader2 size={13} className="animate-spin" />
              : <Send size={13} />
            }
          </button>
        </div>
        {(messages.length > 0 || streaming) && (
          <button
            onClick={() => { setMessages([]); setStreamingContent(""); setStreamError(""); }}
            disabled={streaming}
            className="text-[10px] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors self-start flex items-center gap-1 disabled:opacity-40"
          >
            <Trash2 size={10} /> Clear chat
          </button>
        )}
      </div>
    </div>
  );
}
