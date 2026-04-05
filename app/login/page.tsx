import { login } from "./actions";
import { SiteFooter } from "@/components/site-footer";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; error?: string }>;
}) {
  const { from = "/library", error } = await searchParams;

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-base)]">
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <h1 className="font-serif text-3xl font-semibold text-[var(--text-primary)] mb-1">
              NovelGit
            </h1>
            <p className="text-sm text-[var(--text-muted)]">Enter your passphrase to continue</p>
          </div>

          <form action={login} className="flex flex-col gap-4">
            <input type="hidden" name="from" value={from} />
            <div className="flex flex-col gap-1.5">
              <input
                type="password"
                name="password"
                autoFocus
                autoComplete="current-password"
                placeholder="Passphrase"
                required
                className="w-full px-4 py-2.5 rounded-xl border border-[var(--border-default)] bg-[var(--bg-elevated)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none focus:border-[var(--accent)] transition-colors text-sm"
              />
              {error && (
                <p className="text-xs text-destructive">Incorrect passphrase.</p>
              )}
            </div>
            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-[var(--accent)] text-white text-sm font-medium hover:bg-[var(--accent-hover)] transition-colors"
            >
              Enter
            </button>
          </form>
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}
