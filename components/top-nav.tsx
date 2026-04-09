import Link from "next/link";
import { Settings } from "lucide-react";
import { DarkModeToggle } from "./dark-mode-toggle";

interface TopNavProps {
  breadcrumb?: { label: string; href?: string }[];
}

export function TopNav({ breadcrumb }: TopNavProps) {
  return (
    <nav
      role="navigation"
      aria-label="Main navigation"
      className="h-[var(--nav-height)] border-b border-[var(--border-default)] flex items-center px-4 sm:px-6 gap-4 bg-[var(--bg-elevated)]"
    >
      <Link href="/library" className="font-serif font-semibold text-lg shrink-0">
        NovelGit
      </Link>
      {breadcrumb && (
        <ol className="flex items-center gap-1 text-sm text-[var(--text-muted)] flex-1 min-w-0">
          {breadcrumb.map((crumb, i) => (
            <li key={i} className="flex items-center gap-1 truncate">
              {i > 0 && <span>/</span>}
              {crumb.href ? (
                <Link href={crumb.href} className="hover:text-[var(--text-primary)] truncate">
                  {crumb.label}
                </Link>
              ) : (
                <span className="truncate">{crumb.label}</span>
              )}
            </li>
          ))}
        </ol>
      )}
      <div className="ml-auto flex items-center gap-2">
        <Link
          href="/admin"
          title="AI Settings"
          className="p-1.5 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-sidebar)] transition-colors"
        >
          <Settings size={15} />
        </Link>
        <DarkModeToggle />
      </div>
    </nav>
  );
}
