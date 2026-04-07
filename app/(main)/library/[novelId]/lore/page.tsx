import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getLibrary } from "@/app/(main)/library/actions";
import { getLoreIndex } from "@/lib/lore";
import { assertSafeNovelId } from "@/lib/ids";
import { requireAuth } from "@/lib/auth";
import { LorePageClient } from "./lore-page-client";

export default async function LorePage({
  params,
  searchParams,
}: {
  params:       Promise<{ novelId: string }>;
  searchParams: Promise<{ entry?: string }>;
}) {
  await requireAuth();
  const { novelId } = await params;
  const { entry: initialEntry } = await searchParams;

  try {
    assertSafeNovelId(novelId);
  } catch {
    notFound();
  }

  const library = await getLibrary();
  const novel   = library.novels.find((n) => n.id === novelId);
  if (!novel) notFound();

  const index = await getLoreIndex(novelId);

  return (
    <div className="max-w-[1100px] mx-auto px-6 py-10">
      {/* Back */}
      <Link
        href={`/library/${novelId}`}
        className="inline-flex items-center gap-1.5 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors mb-8"
      >
        <ArrowLeft size={14} />
        {novel.title}
      </Link>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-serif text-3xl font-semibold text-[var(--text-primary)]">
            World-Building
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            {index.entries.length === 0
              ? "No lore entries yet."
              : `${index.entries.length} entr${index.entries.length === 1 ? "y" : "ies"}`}
          </p>
        </div>
      </div>

      <LorePageClient
        novelId={novelId}
        initialEntries={index.entries.map(({ id, type, name, tags, updatedAt }) => ({
          id, type, name, tags, updatedAt,
        }))}
        initialEntryId={initialEntry}
      />
    </div>
  );
}
