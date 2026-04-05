import { copyrightLine } from "@/lib/site";

export function HomeFooter() {
  return (
    <footer
      className="relative z-10 px-8 py-5 flex flex-col sm:flex-row items-center justify-between gap-2 border-t border-[var(--border-default)]"
      style={{ background: "var(--bg-base)" }}
    >
      <span className="font-mono text-xs text-[var(--text-muted)]">{copyrightLine()}</span>
      <span className="font-serif text-xs text-[var(--text-muted)] text-center sm:text-right">
        Your words, your repository.
      </span>
    </footer>
  );
}
