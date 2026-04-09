import type { Metadata } from "next";
import { cookies } from "next/headers";
import { isValidAuthCookie } from "@/lib/auth";
import { HeroSection } from "@/components/home/hero-section";
import { HomeFooter } from "@/components/home/home-footer";
import { PrivateLibrarySignIn } from "@/components/home/private-library-sign-in";
import { ScrollToPrivateLibrary } from "@/components/home/scroll-to-private-library";
import { SignedInLibraryCta } from "@/components/home/signed-in-library-cta";
import { NOVELGIT_GITHUB_URL } from "@/lib/site";
import { getSiteUrl } from "@/lib/site-url";
import { AiFeaturesSection } from "@/components/home/ai-features-section";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

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

  const origin = getSiteUrl().origin;
  const jsonLd = {
    "@context":    "https://schema.org",
    "@type":       "WebApplication",
    "name":        "NovelGit",
    "description":
      "Novel management system for long-form fiction: GitHub-backed Markdown, lore bible, Global Bible, dual RAG AI chat, analytics, and export.",
    "url":         origin,
    "applicationCategory": "ProductivityApplication",
    "operatingSystem":     "Web",
    "isAccessibleForFree": true,
    "sameAs":      [NOVELGIT_GITHUB_URL],
    "offers": {
      "@type":         "Offer",
      "price":         "0",
      "priceCurrency": "USD",
    },
  };

  return (
    <div className="flex flex-col min-h-screen" style={{ background: "var(--bg-base)" }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {!authed && <ScrollToPrivateLibrary enabled={Boolean(sp.from)} />}
      <HeroSection isAuthenticated={authed} />
      <AiFeaturesSection />
      {authed ? (
        <SignedInLibraryCta />
      ) : (
        <PrivateLibrarySignIn defaultFrom={defaultFrom} showError={showError} />
      )}
      <HomeFooter />
    </div>
  );
}
