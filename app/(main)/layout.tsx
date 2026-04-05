import { TopNav } from "@/components/top-nav";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen">
      <TopNav />
      <main id="main-content" className="flex-1">
        {children}
      </main>
    </div>
  );
}
