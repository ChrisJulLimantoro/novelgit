import { cookies } from "next/headers";
import { isValidAuthCookie } from "@/lib/auth";
import { HeroSection } from "@/components/home/hero-section";
import { HomeFooter } from "@/components/home/home-footer";
import { PrivateLibrarySignIn } from "@/components/home/private-library-sign-in";
import { ScrollToPrivateLibrary } from "@/components/home/scroll-to-private-library";
import { SignedInLibraryCta } from "@/components/home/signed-in-library-cta";

function safeFromParam(raw: string | undefined): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return "/library";
  return raw;
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; error?: string }>;
}) {
  const sp = await searchParams;
  const jar = await cookies();
  const authed = isValidAuthCookie(jar.get("auth_token")?.value);

  const defaultFrom = safeFromParam(sp.from);
  const showError = sp.error === "1" || sp.error === "true";

  return (
    <div className="flex flex-col min-h-screen" style={{ background: "var(--bg-base)" }}>
      {!authed && <ScrollToPrivateLibrary enabled={Boolean(sp.from)} />}
      <HeroSection isAuthenticated={authed} />
      {authed ? (
        <SignedInLibraryCta />
      ) : (
        <PrivateLibrarySignIn defaultFrom={defaultFrom} showError={showError} />
      )}
      <HomeFooter />
    </div>
  );
}
