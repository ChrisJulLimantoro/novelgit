import Link from "next/link";
import { copyrightLine, NOVELGIT_GITHUB_URL } from "@/lib/site";

export function SiteFooter() {
  return (
    <footer
      className="mt-auto border-t border-[var(--border-default)] px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-[var(--text-muted)]"
      role="contentinfo"
    >
      <p className="font-mono">{copyrightLine()}</p>
      <Link
        href={NOVELGIT_GITHUB_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="font-serif hover:text-[var(--text-primary)] transition-colors underline-offset-4 hover:underline"
      >
        NovelGit on GitHub
      </Link>
    </footer>
  );
}
