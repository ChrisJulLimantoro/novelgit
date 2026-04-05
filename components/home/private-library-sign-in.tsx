import { login } from "@/app/login/actions";

interface Props {
  defaultFrom: string;
  showError: boolean;
}

export function PrivateLibrarySignIn({ defaultFrom, showError }: Props) {
  return (
    <section
      id="private-library"
      className="relative z-10 border-t border-[var(--border-default)] px-6 py-16 md:py-20"
      style={{ background: "var(--bg-base)" }}
      aria-labelledby="private-library-heading"
    >
      <div className="max-w-md mx-auto">
        <h2
          id="private-library-heading"
          className="font-serif text-2xl md:text-3xl font-semibold text-[var(--text-primary)] text-center mb-2"
        >
          Private library
        </h2>
        <p className="text-sm text-[var(--text-muted)] text-center mb-8">
          This workspace is passphrase-protected. Enter the same value you set as{" "}
          <code className="font-mono text-xs px-1 py-0.5 rounded bg-[var(--bg-elevated)]">
            AUTH_SECRET
          </code>{" "}
          for your deployment.
        </p>

        <form action={login} className="flex flex-col gap-4">
          <input type="hidden" name="from" value={defaultFrom} />
          <div className="flex flex-col gap-1.5">
            <label htmlFor="private-library-passphrase" className="sr-only">
              Passphrase
            </label>
            <input
              id="private-library-passphrase"
              type="password"
              name="password"
              autoComplete="current-password"
              placeholder="Passphrase"
              required
              className="w-full px-4 py-2.5 rounded-xl border border-[var(--border-default)] bg-[var(--bg-elevated)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none focus:border-[var(--accent)] transition-colors text-sm"
            />
            {showError && (
              <p className="text-xs text-destructive" role="alert">
                Incorrect passphrase.
              </p>
            )}
          </div>
          <button
            type="submit"
            className="w-full py-2.5 rounded-xl bg-[var(--accent)] text-white text-sm font-medium hover:bg-[var(--accent-hover)] transition-colors"
          >
            Unlock library
          </button>
        </form>
      </div>
    </section>
  );
}
