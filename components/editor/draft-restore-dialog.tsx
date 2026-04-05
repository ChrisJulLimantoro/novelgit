"use client";

import { useEffect, useState } from "react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
         AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
         AlertDialogTitle } from "@/components/ui/alert-dialog";

interface Props {
  open:       boolean;
  draftDate:  string; // ISO string
  onRestore:  () => void;
  onDiscard:  () => void;
}

export function DraftRestoreDialog({ open, draftDate, onRestore, onDiscard }: Props) {
  // toLocaleString() is locale-sensitive: server locale ≠ browser locale → hydration
  // mismatch. Defer to a useEffect so it only ever runs on the client.
  const [formatted, setFormatted] = useState("");
  useEffect(() => {
    setFormatted(new Date(draftDate).toLocaleString());
  }, [draftDate]);

  return (
    <AlertDialog open={open}>
      <AlertDialogContent role="alertdialog" aria-modal="true">
        <AlertDialogHeader>
          <AlertDialogTitle>Unsaved local draft found</AlertDialogTitle>
          <AlertDialogDescription>
            A local draft from {formatted} is newer than the version on GitHub
            (possibly edited in Obsidian or another device). Restore your local
            draft or use the GitHub version?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onDiscard}>Use GitHub version</AlertDialogCancel>
          <AlertDialogAction onClick={onRestore}>Restore local draft</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
