"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ExternalLink } from "lucide-react";
import { DarkModeToggle } from "@/components/dark-mode-toggle";
import { Button } from "@/components/ui/button";
import { NOVELGIT_GITHUB_URL } from "@/lib/site";

const panels = [
  {
    label: "git commit",
    text: "Every save is a commit. Your entire writing history, browsable on GitHub.",
  },
  {
    label: "~/library",
    text: "Organize multiple novels in one repository. Switch between projects instantly.",
  },
  {
    label: "status: writing",
    text: "Track where each novel lives in your process — from planning to complete.",
  },
];

const orbs = [
  {
    style: { width: 600, height: 600, top: "-8rem", left: "-8rem" },
    animate: { x: [0, 30, -20, 0], y: [0, 40, -15, 0] },
    duration: 18,
  },
  {
    style: { width: 700, height: 700, bottom: "-10rem", right: "-6rem" },
    animate: { x: [0, -40, 20, 0], y: [0, -30, 20, 0] },
    duration: 24,
  },
  {
    style: { width: 320, height: 320, top: "35%", right: "25%" },
    animate: { x: [0, 20, -10, 0], y: [0, -20, 15, 0] },
    duration: 14,
  },
];

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12 } },
};

const easeOut = [0.16, 1, 0.3, 1] as [number, number, number, number];

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: easeOut } },
};

interface HeroSectionProps {
  isAuthenticated: boolean;
}

export function HeroSection({ isAuthenticated }: HeroSectionProps) {
  const prefersReduced = useReducedMotion();
  const libraryHref = isAuthenticated ? "/library" : "/#private-library";

  return (
    <div
      className="relative min-h-screen flex flex-col overflow-hidden"
      style={{ background: "var(--bg-base)" }}
    >
      {/* Gradient mesh orbs */}
      {!prefersReduced && (
        <div aria-hidden="true" className="absolute inset-0 overflow-hidden pointer-events-none">
          {orbs.map((orb, i) => (
            <motion.div
              key={i}
              className="absolute rounded-full"
              style={{
                ...orb.style,
                background: i === 1
                  ? "radial-gradient(circle, var(--glow-secondary) 0%, transparent 70%)"
                  : "radial-gradient(circle, var(--glow-primary) 0%, transparent 70%)",
              }}
              animate={orb.animate}
              transition={{
                duration: orb.duration,
                repeat: Infinity,
                repeatType: "loop",
                ease: "easeInOut",
              }}
            />
          ))}
        </div>
      )}

      {/* Floating centered pill nav */}
      <div className="fixed top-4 left-0 right-0 z-50 flex justify-center px-4 pointer-events-none">
        <nav
          className="pointer-events-auto flex items-center gap-5 px-6 py-2.5 rounded-full backdrop-blur-md border"
          style={{
            background: "var(--nav-float-bg)",
            borderColor: "var(--nav-float-border)",
            boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
          }}
        >
          <span className="font-serif font-semibold text-base text-[var(--text-primary)]">
            NovelGit
          </span>
          <div
            className="w-px h-4 shrink-0"
            style={{ background: "var(--border-default)" }}
          />
          <Link
            href={libraryHref}
            className="font-mono text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
          >
            Library
          </Link>
          <DarkModeToggle />
        </nav>
      </div>

      {/* Hero section */}
      <section className="relative z-10 flex-1 flex items-center pt-24 pb-16">
        <div className="w-full max-w-6xl mx-auto px-8 grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-16 items-center">

          {/* Left: staggered text */}
          <motion.div
            className="max-w-2xl"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            <motion.p
              className="font-mono text-xs text-[var(--text-muted)] mb-6 tracking-wider uppercase"
              variants={itemVariants}
            >
              git-backed · markdown-native · yours
            </motion.p>

            <motion.h1
              className="font-serif text-6xl lg:text-7xl font-semibold leading-[1.05] mb-6"
              variants={itemVariants}
            >
              <span
                className="bg-clip-text text-transparent bg-[length:200%_200%] inline-block"
                style={{
                  backgroundImage:
                    "linear-gradient(135deg, var(--hero-gradient-from), var(--hero-gradient-to), var(--hero-gradient-from))",
                  animation: prefersReduced ? "none" : "gradientShift 8s ease infinite",
                }}
              >
                Write novels.
              </span>
              <br />
              <span className="text-[var(--text-primary)]">Never lose a word.</span>
            </motion.h1>

            <motion.p
              className="text-lg text-[var(--text-muted)] leading-relaxed mb-10 max-w-xl"
              variants={itemVariants}
            >
              NovelGit keeps your manuscript in a private GitHub repository — so every
              revision is saved, every draft recoverable, and your story is always yours.
            </motion.p>

            <motion.div variants={itemVariants} className="flex flex-wrap items-center gap-3">
              <motion.div
                whileHover={prefersReduced ? {} : { scale: 1.03 }}
                whileTap={prefersReduced ? {} : { scale: 0.97 }}
                transition={{ type: "spring", stiffness: 400, damping: 20 }}
                className="inline-block"
              >
                <Link href={libraryHref}>
                  <Button
                    className="px-8 h-10 text-base rounded-full"
                    style={{
                      background: "var(--accent)",
                      color: "#fff",
                    }}
                  >
                    {isAuthenticated ? "Open Library →" : "Unlock library →"}
                  </Button>
                </Link>
              </motion.div>
              <motion.div
                whileHover={prefersReduced ? {} : { scale: 1.03 }}
                whileTap={prefersReduced ? {} : { scale: 0.97 }}
                transition={{ type: "spring", stiffness: 400, damping: 20 }}
                className="inline-block"
              >
                <a
                  href={NOVELGIT_GITHUB_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button
                    variant="outline"
                    className="px-6 h-10 text-base rounded-full gap-2 border-[var(--border-default)] bg-[var(--bg-elevated)] hover:bg-[var(--bg-base)]"
                  >
                    <ExternalLink className="size-4" aria-hidden />
                    View on GitHub
                  </Button>
                </a>
              </motion.div>
            </motion.div>
          </motion.div>

          {/* Right: glass panels */}
          <div className="hidden lg:flex flex-col gap-4 w-72">
            {panels.map((panel, i) => (
              <motion.div
                key={panel.label}
                initial={prefersReduced ? false : { opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{
                  delay: 0.3 + i * 0.12,
                  duration: 0.5,
                  ease: easeOut,
                }}
                whileHover={
                  prefersReduced
                    ? {}
                    : {
                        y: -4,
                        transition: { type: "spring", stiffness: 300, damping: 20 },
                      }
                }
                className="rounded-2xl p-5 border backdrop-blur-md cursor-default"
                style={{
                  background: "var(--glass-bg)",
                  borderColor: "var(--glass-border)",
                  boxShadow: "var(--glass-shadow)",
                }}
              >
                <p className="font-mono text-xs text-[var(--text-muted)] mb-2">{panel.label}</p>
                <p className="font-serif text-sm text-[var(--text-primary)] leading-snug">
                  {panel.text}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
