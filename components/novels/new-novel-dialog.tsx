"use client";

import { useState, useTransition } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createNovel } from "@/app/(main)/library/actions";
import { GENRES } from "@/types/novel";
import { cn } from "@/lib/utils";
import { PendingOverlay } from "@/components/ui/pending-overlay";

interface Props {
  triggerSize?: "default" | "lg";
}

export function NewNovelDialog({ triggerSize = "default" }: Props) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);

  function toggleGenre(genre: string) {
    setSelectedGenres((prev) =>
      prev.includes(genre) ? prev.filter((g) => g !== genre) : [...prev, genre]
    );
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    formData.set("genres", JSON.stringify(selectedGenres));
    startTransition(async () => {
      await createNovel(formData);
      setOpen(false);
      setSelectedGenres([]);
    });
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) setSelectedGenres([]);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && isPending) return; // block close while creating
        handleOpenChange(nextOpen);
      }}
    >
      <DialogTrigger render={<Button size={triggerSize} />}>New Novel</DialogTrigger>
      <DialogContent aria-labelledby="new-novel-title" showCloseButton={!isPending}>
        <DialogHeader>
          <DialogTitle id="new-novel-title">New Novel</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="relative flex flex-col gap-5">
          {isPending && <PendingOverlay label="Creating novel…" />}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="title">Title</Label>
            <Input id="title" name="title" required placeholder="The Void Chronicles" />
          </div>

          <div className="flex flex-col gap-2">
            <Label>
              Genre
              <span className="ml-1.5 font-normal text-[var(--text-muted)]">(optional, pick any)</span>
            </Label>
            <div className="flex flex-wrap gap-2">
              {GENRES.map((genre) => {
                const active = selectedGenres.includes(genre);
                return (
                  <button
                    key={genre}
                    type="button"
                    onClick={() => toggleGenre(genre)}
                    aria-pressed={active}
                    className={cn(
                      "px-3 py-2 md:py-1 rounded-full text-xs border transition-all duration-150 select-none",
                      active
                        ? "bg-[var(--accent)]/10 border-[var(--accent)] text-[var(--accent)] font-medium"
                        : "border-[var(--border-default)] text-[var(--text-muted)] hover:border-[var(--accent)]/50 hover:text-[var(--text-primary)]"
                    )}
                  >
                    {genre}
                  </button>
                );
              })}
            </div>
          </div>

          <Button type="submit" disabled={isPending}>
            {isPending ? "Creating…" : "Create"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
