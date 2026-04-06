export type FontSize = "sm" | "md" | "lg" | "xl";
export type ReadingTheme = "default" | "sepia" | "night";

export interface ReaderPrefs {
  fontSize:     FontSize;
  readingTheme: ReadingTheme;
}

const DEFAULTS: ReaderPrefs = { fontSize: "md", readingTheme: "default" };

export function loadReaderPrefs(): ReaderPrefs {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = localStorage.getItem("reader-prefs");
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw);
    return {
      fontSize:     parsed.fontSize     ?? DEFAULTS.fontSize,
      readingTheme: parsed.readingTheme ?? DEFAULTS.readingTheme,
    };
  } catch {
    return DEFAULTS;
  }
}

export function saveReaderPrefs(prefs: ReaderPrefs): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem("reader-prefs", JSON.stringify(prefs));
  } catch {}
}
