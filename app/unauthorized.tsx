import Link from "next/link";

export default function Unauthorized() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3 p-6 bg-[var(--bg-base)]">
      <h1 className="font-serif text-2xl font-semibold text-[var(--text-primary)]">Session required</h1>
      <p className="text-sm text-[var(--text-muted)] text-center max-w-sm">
        Sign in on the home page to use the library and editor.
      </p>
      <Link
        href="/#private-library"
        className="text-sm text-[var(--accent)] underline underline-offset-4 hover:opacity-90"
      >
        Go to sign in
      </Link>
    </div>
  );
}
