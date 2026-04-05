"use client";

import { useEffect } from "react";

/** When the user is sent here with ?from=… (e.g. from middleware), scroll to the sign-in block. */
export function ScrollToPrivateLibrary({ enabled }: { enabled: boolean }) {
  useEffect(() => {
    if (!enabled) return;
    const el = document.getElementById("private-library");
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [enabled]);
  return null;
}
