"use client";

import { motion, useReducedMotion } from "framer-motion";
import {
  BookOpen,
  BrainCircuit,
  GitBranch,
  Globe,
  MessageSquareText,
  Sparkles,
} from "lucide-react";

const features = [
  {
    icon: MessageSquareText,
    title: "Dual RAG AI Chat",
    badge: "core",
    description:
      "Every query simultaneously retrieves from your lore bible and manuscript chapters. The AI sees both sources before answering — no context left out.",
    tags: ["lore RAG", "manuscript RAG"],
  },
  {
    icon: Globe,
    title: "Global Bible",
    badge: "AI",
    description:
      "Auto-generated story overview: major plot points, character status, world rules, open threads. Rebuilt on reindex from per-chapter Gemini summaries and injected into every chat.",
    tags: ["Gemini distillation", "per-chapter patch"],
  },
  {
    icon: BrainCircuit,
    title: "HyDE Retrieval",
    badge: "AI",
    description:
      "Before searching the manuscript, Groq generates a hypothetical prose excerpt that would answer your question. That passage is embedded and used for cosine similarity search — bridging intent to prose.",
    tags: ["query expansion", "semantic search"],
  },
  {
    icon: Sparkles,
    title: "Chapter Distillation",
    badge: "AI",
    description:
      "On reindex, Gemini reads each chapter and extracts a summary, named entities, and scene tags. These feed the Global Bible and enrich retrieval scoring.",
    tags: ["summary", "entity extraction", "scene tags"],
  },
  {
    icon: BookOpen,
    title: "Lore World-Bible",
    badge: "vector",
    description:
      "Characters, locations, factions, events, and items — each entry embedded with Voyage voyage-3. Entity-hint heuristics catch 'who is X' patterns that pure cosine similarity misses.",
    tags: ["Voyage voyage-3", "1024-d", "keyword fallback"],
  },
  {
    icon: GitBranch,
    title: "Git-Synced Manuscripts",
    badge: "storage",
    description:
      "Every chapter save is a GitHub commit via the Contents API. Full revision history in a repo you own — readable in any Markdown editor, portable forever.",
    tags: ["Octokit", "plain Markdown", "version control"],
  },
];

const easeOut = [0.16, 1, 0.3, 1] as [number, number, number, number];

const badgeColors: Record<string, { bg: string; text: string }> = {
  core:    { bg: "rgba(var(--accent-rgb, 40,68,144), 0.12)", text: "var(--accent)" },
  AI:      { bg: "rgba(var(--accent-rgb, 40,68,144), 0.08)", text: "var(--accent)" },
  vector:  { bg: "rgba(var(--accent-rgb, 40,68,144), 0.06)", text: "var(--text-muted)" },
  storage: { bg: "rgba(var(--accent-rgb, 40,68,144), 0.06)", text: "var(--text-muted)" },
};

export function AiFeaturesSection() {
  const prefersReduced = useReducedMotion();

  return (
    <section
      className="relative z-10 border-t border-[var(--border-default)] px-6 py-20 md:py-28"
      style={{ background: "var(--bg-base)" }}
      aria-labelledby="ai-features-heading"
    >
      {/* Subtle background glow */}
      {!prefersReduced && (
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
          <div
            className="absolute left-1/2 top-0 -translate-x-1/2 w-[800px] h-[400px] rounded-full opacity-30"
            style={{
              background:
                "radial-gradient(ellipse at 50% 0%, var(--glow-primary) 0%, transparent 70%)",
            }}
          />
        </div>
      )}

      <div className="relative max-w-6xl mx-auto">
        {/* Section header */}
        <motion.div
          className="text-center mb-16"
          initial={prefersReduced ? false : { opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, ease: easeOut }}
        >
          <p className="font-mono text-xs text-[var(--text-muted)] tracking-wider uppercase mb-4">
            what's under the hood
          </p>
          <h2
            id="ai-features-heading"
            className="font-serif text-4xl md:text-5xl font-semibold text-[var(--text-primary)] mb-4"
          >
            AI that reads your whole novel
          </h2>
          <p className="text-base text-[var(--text-muted)] max-w-xl mx-auto leading-relaxed">
            Every AI feature is layered on top of plain Markdown files you own. Nothing is
            locked in — turn off any key and the writing features keep working.
          </p>
        </motion.div>

        {/* Feature grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((feature, i) => {
            const Icon = feature.icon;
            const badge = badgeColors[feature.badge] ?? badgeColors.storage;
            return (
              <motion.div
                key={feature.title}
                initial={prefersReduced ? false : { opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.5, delay: i * 0.07, ease: easeOut }}
                whileHover={
                  prefersReduced ? {} : { y: -4, transition: { type: "spring", stiffness: 280, damping: 20 } }
                }
                className="rounded-2xl p-6 border backdrop-blur-sm cursor-default"
                style={{
                  background: "var(--glass-bg)",
                  borderColor: "var(--glass-border)",
                  boxShadow: "var(--glass-shadow)",
                }}
              >
                {/* Icon + badge row */}
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div
                    className="flex items-center justify-center w-9 h-9 rounded-xl shrink-0"
                    style={{ background: "color-mix(in srgb, var(--accent) 10%, transparent)" }}
                  >
                    <Icon
                      size={18}
                      style={{ color: "var(--accent)" }}
                      aria-hidden
                    />
                  </div>
                  <span
                    className="font-mono text-[10px] tracking-wider uppercase px-2 py-0.5 rounded-full"
                    style={{ background: badge.bg, color: badge.text }}
                  >
                    {feature.badge}
                  </span>
                </div>

                {/* Title */}
                <h3 className="font-serif text-base font-semibold text-[var(--text-primary)] mb-2 leading-snug">
                  {feature.title}
                </h3>

                {/* Description */}
                <p className="text-sm text-[var(--text-muted)] leading-relaxed mb-4">
                  {feature.description}
                </p>

                {/* Tags */}
                <div className="flex flex-wrap gap-1.5">
                  {feature.tags.map((tag) => (
                    <span
                      key={tag}
                      className="font-mono text-[10px] px-2 py-0.5 rounded-md"
                      style={{
                        background: "color-mix(in srgb, var(--text-muted) 8%, transparent)",
                        color: "var(--text-muted)",
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Bottom hint */}
        <motion.p
          className="text-center font-mono text-xs text-[var(--text-muted)] mt-12 tracking-wide"
          initial={prefersReduced ? false : { opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4, ease: easeOut }}
        >
          All AI keys are optional — features degrade gracefully. Only{" "}
          <span style={{ color: "var(--text-primary)" }}>GITHUB_TOKEN</span>,{" "}
          <span style={{ color: "var(--text-primary)" }}>GITHUB_REPO</span>, and{" "}
          <span style={{ color: "var(--text-primary)" }}>AUTH_SECRET</span> are required.
        </motion.p>
      </div>
    </section>
  );
}
