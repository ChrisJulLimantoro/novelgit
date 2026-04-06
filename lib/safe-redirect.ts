/** Only same-origin relative paths (prevents open redirects after login). */
export function safeInternalPath(raw: string, fallback = "/library"): string {
  let decoded: string;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    return fallback;
  }
  if (!decoded.startsWith("/") || decoded.startsWith("//")) return fallback;
  return decoded;
}
