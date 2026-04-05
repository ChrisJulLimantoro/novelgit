import { redirect } from "next/navigation";

/** Legacy URL: send visitors to the home page sign-in block (after the hero). */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; error?: string }>;
}) {
  const { from = "/library", error } = await searchParams;
  const q = new URLSearchParams();
  q.set("from", from);
  if (error) q.set("error", error);
  redirect(`/?${q.toString()}#private-library`);
}
