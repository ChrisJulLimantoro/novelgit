"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth";
import { assertSafeNovelId } from "@/lib/ids";
import { getGlobalBible, updateGlobalBible } from "@/lib/manuscript-rag";

export async function loadGlobalBible(novelId: string): Promise<string> {
  assertSafeNovelId(novelId);
  return getGlobalBible(novelId);
}

export async function saveGlobalBible(novelId: string, content: string): Promise<void> {
  await requireAuth();
  assertSafeNovelId(novelId);
  await updateGlobalBible(novelId, content);
  revalidatePath(`/library/${novelId}`);
}
