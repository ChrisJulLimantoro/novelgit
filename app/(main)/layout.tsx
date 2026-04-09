import type { Metadata } from "next";
import { TopNav } from "@/components/top-nav";
import { SiteFooter } from "@/components/site-footer";

/** App shell behind auth — keep search results focused on the public landing page. */
export const metadata: Metadata = {
  robots: { index: false, follow: true },
};

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen">
      <TopNav />
      <main id="main-content" className="flex-1">
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
