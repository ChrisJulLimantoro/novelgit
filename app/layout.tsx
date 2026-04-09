import type { Metadata } from "next";
import { Geist, Geist_Mono, Lora } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { GlobalLoaderProvider } from "@/components/ui/global-loader";
import { NOVELGIT_GITHUB_URL } from "@/lib/site";
import { getSiteUrl } from "@/lib/site-url";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const lora = Lora({ variable: "--font-lora", subsets: ["latin"] });

const siteUrl = getSiteUrl();

export const metadata: Metadata = {
  metadataBase: siteUrl,
  title: {
    default: "NovelGit — AI novel management for GitHub-backed manuscripts",
    template: "%s | NovelGit",
  },
  description:
    "Self-hosted novel management system: Git-synced Markdown writing, lore bible, Global Bible, dual RAG AI chat, analytics, and export. Your stories stay in your GitHub repo.",
  applicationName: "NovelGit",
  keywords: [
    "novel management system",
    "novel writing software",
    "AI writing assistant",
    "GitHub novel",
    "markdown novel editor",
    "long-form fiction",
    "world bible",
    "lore bible",
    "RAG writing",
    "self-hosted writing app",
  ],
  authors: [{ name: "NovelGit", url: NOVELGIT_GITHUB_URL }],
  creator: "NovelGit",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteUrl,
    siteName: "NovelGit",
    title: "NovelGit — AI novel management for GitHub-backed manuscripts",
    description:
      "Write and manage novels in Markdown, synced to your own GitHub repository — with lore, Global Bible, and AI that reads your manuscript.",
  },
  twitter: {
    card: "summary_large_image",
    title: "NovelGit — AI novel management for GitHub-backed manuscripts",
    description:
      "Git-backed Markdown novels, lore bible, Global Bible, and dual RAG AI chat. Self-hosted and open source.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

// Runs before React loads — reads the saved preference and applies the
// correct class to <html> immediately, preventing a flash of wrong theme.
// Because this is a Server Component, React never reconciles this <script>
// on the client and React 19 will not emit the "Encountered a script tag"
// warning that fires for <script> elements inside Client Components.
const themeInitScript = `try{var t=localStorage.getItem('theme')||'system',d=t==='dark'||(t==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',d)}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${lora.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <ThemeProvider defaultTheme="system">
          <GlobalLoaderProvider>
            {children}
          </GlobalLoaderProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
