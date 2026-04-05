import Link from "next/link";
import { StatusBadge } from "./status-badge";
import type { Novel } from "@/types/novel";
import { cn } from "@/lib/utils";

interface NovelCardProps {
  novel: Novel;
  featured?: boolean;
  className?: string;
}

export function NovelCard({ novel, featured = false, className }: NovelCardProps) {
  return (
    <Link
      href={`/library/${novel.id}`}
      className={cn(
        "group block h-full border-l-4 rounded-xl border border-[var(--border-default)]",
        "bg-[var(--bg-elevated)] transition-all duration-200 ease-out",
        "hover:-translate-y-0.5 hover:shadow-[var(--shadow-lift)]",
        className
      )}
      style={{ borderLeftColor: `var(--status-${novel.status})` }}
    >
      <div className="flex flex-col gap-3 p-5 h-full">
        <div className="flex items-start justify-between gap-3">
          <h2
            className={cn(
              "font-serif font-semibold text-[var(--text-primary)] leading-snug",
              featured ? "text-2xl" : "text-lg"
            )}
          >
            {novel.title}
          </h2>
          <StatusBadge status={novel.status} variant="filled" />
        </div>
        {novel.genres.length > 0 ? (
          <div className="flex flex-wrap gap-1.5 mt-auto">
            {novel.genres.map((genre) => (
              <span
                key={genre}
                className="px-2 py-0.5 rounded-full text-[10px] border border-[var(--border-default)] text-[var(--text-muted)]"
              >
                {genre}
              </span>
            ))}
          </div>
        ) : (
          <p className="font-mono text-xs text-[var(--text-muted)] mt-auto truncate">
            {novel.path}
          </p>
        )}
      </div>
    </Link>
  );
}
