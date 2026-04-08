"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { createChapter } from "@/app/(editor)/edit/[novelId]/[chapterSlug]/actions";
import { PendingOverlay } from "@/components/ui/pending-overlay";

export function NewChapterButton({ novelId }: { novelId: string }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const title = (new FormData(e.currentTarget).get("title") as string).trim();
    if (!title) return;
    startTransition(async () => {
      const slug = await createChapter(novelId, title);
      setOpen(false);
      router.push(`/edit/${novelId}/${slug}`);
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && isPending) return; // block close while creating
        setOpen(nextOpen);
      }}
    >
      <DialogTrigger render={<Button />}>New Chapter</DialogTrigger>
      <DialogContent aria-labelledby="new-chapter-title" showCloseButton={!isPending}>
        <DialogHeader>
          <DialogTitle id="new-chapter-title">New Chapter</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="relative flex flex-col gap-4">
          {isPending && <PendingOverlay label="Creating chapter…" />}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="chapter-title">Title</Label>
            <Input id="chapter-title" name="title" required placeholder="Chapter One" autoFocus />
          </div>
          <Button type="submit" disabled={isPending}>
            {isPending ? "Creating…" : "Create & Open"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
