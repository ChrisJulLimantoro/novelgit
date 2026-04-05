export function countWords(markdown: string): number {
  return markdown
    .replace(/```[\s\S]*?```/g, "")    // strip code blocks
    .replace(/`[^`]*`/g, "")            // strip inline code
    .replace(/\[\[([^\]]+)\]\]/g, "$1") // unwrap WikiLinks
    .replace(/[#*_~\[\]()>]/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}
