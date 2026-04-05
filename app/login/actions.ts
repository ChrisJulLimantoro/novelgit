"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

function safeInternalPath(raw: string | null | undefined, fallback: string): string {
  if (!raw || typeof raw !== "string" || !raw.startsWith("/") || raw.startsWith("//")) {
    return fallback;
  }
  return raw;
}

export async function login(formData: FormData) {
  const password = formData.get("password") as string;
  const from = safeInternalPath(formData.get("from") as string | null, "/library");

  if (password !== process.env.AUTH_SECRET) {
    const q = new URLSearchParams();
    q.set("from", from);
    q.set("error", "1");
    redirect(`/?${q.toString()}#private-library`);
  }

  const jar = await cookies();
  jar.set("auth_token", process.env.AUTH_SECRET!, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: "/",
  });

  redirect(from);
}
