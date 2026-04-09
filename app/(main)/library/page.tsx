import { Suspense } from "react";
import { getLibrary } from "./actions";
import { LibraryView, EmptyLibraryView } from "@/components/novels/library-view";
import { NewNovelDialog } from "@/components/novels/new-novel-dialog";
import { Skeleton } from "@/components/ui/skeleton";

function LibrarySkeleton() {
  return (
    <div className="space-y-5">
      <Skeleton className="h-9 w-full rounded-lg" />
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="aspect-[2/3] rounded-xl" />
            <Skeleton className="h-4 w-3/4 rounded" />
            <Skeleton className="h-3 w-1/2 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}

async function LibraryContent() {
  const library = await getLibrary();
  if (library.novels.length === 0) return <EmptyLibraryView />;
  return <LibraryView novels={library.novels} />;
}

export default function LibraryPage() {
  return (
    <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-8 sm:py-10">
      <div className="flex items-center justify-between gap-3 mb-8">
        <h1 className="font-serif text-3xl font-semibold">Library</h1>
        <NewNovelDialog />
      </div>
      <Suspense fallback={<LibrarySkeleton />}>
        <LibraryContent />
      </Suspense>
    </div>
  );
}
