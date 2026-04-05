"use client";
import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";

export function DarkModeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  return (
    <button
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      className="p-2 rounded-md hover:bg-[var(--bg-sidebar)] transition-colors"
      aria-label="Toggle dark mode"
    >
      {resolvedTheme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}
