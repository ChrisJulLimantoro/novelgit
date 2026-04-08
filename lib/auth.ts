import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { unauthorized } from "next/navigation";

const SESSION_ID_BYTES = 32;
const HEX64 = /^[a-f0-9]{64}$/i;

/** Opaque session token: `{sessionId}.{hmac}`. Does not embed `AUTH_SECRET`. */
export function createSessionToken(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not configured");
  const sessionId = randomBytes(SESSION_ID_BYTES).toString("hex");
  const sig = createHmac("sha256", secret).update(sessionId).digest("hex");
  return `${sessionId}.${sig}`;
}

export function verifySessionToken(token: string): boolean {
  const secret = process.env.AUTH_SECRET;
  if (!secret) return false;
  const dot = token.indexOf(".");
  if (dot < 1) return false;
  const sessionId = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  if (!HEX64.test(sessionId) || !HEX64.test(sig)) return false;
  const expected = createHmac("sha256", secret).update(sessionId).digest("hex");
  try {
    return timingSafeEqual(Buffer.from(sig, "hex"), Buffer.from(expected, "hex"));
  } catch {
    return false;
  }
}

/** Accepts current opaque token or legacy cookie that stored raw `AUTH_SECRET`. */
export function isValidAuthCookie(token: string | undefined): boolean {
  if (!token) return false;
  if (verifySessionToken(token)) return true;
  // Legacy path: old cookies stored the raw secret. Use constant-time compare to
  // avoid timing-based side-channel leakage even on this deprecated code path.
  if (process.env.AUTH_SECRET) {
    try {
      const a = Buffer.from(token);
      const b = Buffer.from(process.env.AUTH_SECRET);
      if (a.length === b.length && timingSafeEqual(a, b)) return true;
    } catch { /* length mismatch or invalid input */ }
  }
  return false;
}

export async function requireAuth(): Promise<void> {
  const jar = await cookies();
  if (!isValidAuthCookie(jar.get("auth_token")?.value)) {
    unauthorized();
  }
}
