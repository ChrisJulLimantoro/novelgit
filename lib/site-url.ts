/**
 * Canonical site origin for metadata (Open Graph, sitemap, JSON-LD).
 * Set `NEXT_PUBLIC_SITE_URL` in production (e.g. https://your-app.vercel.app).
 * On Vercel, `VERCEL_URL` is used as a fallback when the public URL is unset.
 */
export function getSiteUrl(): URL {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) {
    try {
      return new URL(explicit.endsWith("/") ? explicit.slice(0, -1) : explicit);
    } catch {
      /* fall through */
    }
  }
  if (process.env.VERCEL_URL) {
    const host = process.env.VERCEL_URL.replace(/^https?:\/\//, "");
    return new URL(`https://${host}`);
  }
  return new URL("https://novelgit.vercel.app");
}
