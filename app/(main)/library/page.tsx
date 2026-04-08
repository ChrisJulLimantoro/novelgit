import { Suspense } from "react";
import { getLibrary } from "./actions";
import { NovelCard } from "@/components/novels/novel-card";
import { NewNovelDialog } from "@/components/novels/new-novel-dialog";
import { Skeleton } from "@/components/ui/skeleton";

function LibrarySkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <Skeleton className="md:col-span-2 h-52 rounded-xl" />
      <Skeleton className="h-40 rounded-xl" />
      <Skeleton className="h-40 rounded-xl" />
      <Skeleton className="h-40 rounded-xl" />
    </div>
  );
}

function EmptyLibrary() {
  return (
    <div className="flex flex-col items-center gap-8 py-24 text-center">
      <svg
        width="72"
        height="72"
        viewBox="0 0 72 72"
        fill="none"
        aria-hidden="true"
        className="text-[var(--text-muted)] opacity-40"
      >
        <path
          d="M58 6C58 6 48 16 38 30C28 44 28 60 28 60C28 60 38 50 48 40C58 30 68 20 58 6Z"
          stroke="currentColor"
          strokeWidth="2"
          fill="none"
          strokeLinejoin="round"
        />
        <path d="M28 60L10 68" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path
          d="M44 22L22 44"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeDasharray="4 4"
          opacity="0.5"
        />
        <circle cx="28" cy="60" r="2" fill="currentColor" opacity="0.6" />
      </svg>
      <div>
        <p className="font-serif text-2xl text-[var(--text-primary)] mb-2">Your library awaits.</p>
        <p className="text-sm text-[var(--text-muted)] leading-relaxed max-w-[32ch] mx-auto">
          Every great story starts somewhere. Create your first novel to begin.
        </p>
      </div>
      <NewNovelDialog triggerSize="lg" />
    </div>
  );
}

async function LibraryGrid() {
  const library = await getLibrary();

  if (library.novels.length === 0) {
    return <EmptyLibrary />;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {library.novels.map((novel, i) => (
        <div key={novel.id} className={i === 0 ? "md:col-span-2" : ""}>
          <NovelCard novel={novel} featured={i === 0} />
        </div>
      ))}
    </div>
  );
}

export default function LibraryPage() {
  return (
    <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-8 sm:py-10">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-8">
        <h1 className="font-serif text-3xl font-semibold">Library</h1>
        <NewNovelDialog />
      </div>
      <Suspense fallback={<LibrarySkeleton />}>
        <LibraryGrid />
      </Suspense>
    </div>
  );
}
