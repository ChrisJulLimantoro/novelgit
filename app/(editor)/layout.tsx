import type { Metadata } from "next";

export const metadata: Metadata = {
  robots: { index: false, follow: true },
};

export default function EditorLayout({ children }: { children: React.ReactNode }) {
  return <div className="h-screen flex flex-col overflow-hidden">{children}</div>;
}
