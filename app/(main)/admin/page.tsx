import Link from "next/link";
import { getAiConfig } from "@/lib/ai/ai-config";
import { AiSettingsEditor } from "@/components/admin/ai-settings-editor";
import { ArrowLeft, Settings } from "lucide-react";

export default async function AdminPage() {
  const config = await getAiConfig();

  return (
    <div className="max-w-[760px] mx-auto px-4 sm:px-6 py-8 sm:py-10">
      <Link
        href="/library"
        className="inline-flex items-center gap-1.5 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors mb-8"
      >
        <ArrowLeft size={14} />
        Library
      </Link>

      <div className="flex items-center gap-2.5 mb-8">
        <Settings size={18} className="text-[var(--text-muted)]" />
        <h1 className="font-serif text-2xl font-semibold text-[var(--text-primary)]">
          AI Settings
        </h1>
      </div>

      <AiSettingsEditor initial={config} />
    </div>
  );
}
