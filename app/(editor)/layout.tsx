export default function EditorLayout({ children }: { children: React.ReactNode }) {
  return <div className="h-screen flex flex-col overflow-hidden">{children}</div>;
}
