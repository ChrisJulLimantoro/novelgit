"use server";

import { requireAuth } from "@/lib/auth";
import { getAiConfig, updateAiConfig } from "@/lib/ai/ai-config";
import { AiConfigSchema } from "@/types/ai-config";
import type { AiConfig } from "@/types/ai-config";

export async function loadAiConfig(): Promise<AiConfig> {
  return getAiConfig();
}

export async function saveAiConfig(data: AiConfig): Promise<void> {
  await requireAuth();
  await updateAiConfig(AiConfigSchema.parse(data));
}
