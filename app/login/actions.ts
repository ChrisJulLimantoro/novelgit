"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export async function login(formData: FormData) {
  const password = formData.get("password") as string;
  const from = (formData.get("from") as string) || "/library";

  if (password !== process.env.AUTH_SECRET) {
    redirect(`/login?from=${encodeURIComponent(from)}&error=1`);
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
