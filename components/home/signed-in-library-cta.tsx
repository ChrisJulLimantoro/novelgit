import Link from "next/link";
import { Button } from "@/components/ui/button";

export function SignedInLibraryCta() {
  return (
    <section
      className="relative z-10 border-t border-[var(--border-default)] px-6 py-14 md:py-16"
      style={{ background: "var(--bg-base)" }}
      aria-labelledby="signed-in-heading"
    >
      <div className="max-w-md mx-auto text-center">
        <h2
          id="signed-in-heading"
          className="font-serif text-xl md:text-2xl font-semibold text-[var(--text-primary)] mb-3"
        >
          You&apos;re signed in
        </h2>
        <p className="text-sm text-[var(--text-muted)] mb-6">
          Open your library to manage novels, chapters, and sync.
        </p>
        <Link href="/library">
          <Button
            className="px-8 h-10 text-base rounded-full"
            style={{
              background: "var(--accent)",
              color: "#fff",
            }}
          >
            Go to library →
          </Button>
        </Link>
      </div>
    </section>
  );
}
