import { getFile, getFileSha, putFile } from "@/lib/github-content";
import { AiConfigSchema, AI_CONFIG_DEFAULTS } from "@/types/ai-config";
import type { AiConfig } from "@/types/ai-config";

const AI_CONFIG_PATH = "ai-config.json";

export async function getAiConfig(): Promise<AiConfig> {
  try {
    const { content } = await getFile(AI_CONFIG_PATH);
    return AiConfigSchema.parse(JSON.parse(content));
  } catch {
    return AI_CONFIG_DEFAULTS;
  }
}

export async function updateAiConfig(config: AiConfig): Promise<void> {
  const sha = await getFileSha(AI_CONFIG_PATH);
  await putFile(
    AI_CONFIG_PATH,
    JSON.stringify(AiConfigSchema.parse(config), null, 2),
    sha,
    "chore: update ai-config",
  );
}
