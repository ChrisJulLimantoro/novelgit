"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createSessionToken } from "@/lib/auth";
import { safeInternalPath } from "@/lib/safe-redirect";

export async function login(formData: FormData) {
  const password = formData.get("password") as string;
  const fromRaw = (formData.get("from") as string) || "/library";

  if (password !== process.env.AUTH_SECRET) {
    const q = new URLSearchParams();
    q.set("from", safeInternalPath(fromRaw));
    q.set("error", "1");
    redirect(`/?${q.toString()}#private-library`);
  }

  const jar = await cookies();
  jar.set("auth_token", createSessionToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: "/",
  });

  redirect(safeInternalPath(fromRaw));
}
