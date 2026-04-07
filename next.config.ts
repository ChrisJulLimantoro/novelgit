import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Embeddings use `fetch` to api.voyageai.com (see lib/ai/embeddings.ts). The
  // `voyageai` npm SDK is not used — its ESM/CJS layout breaks Next/Turbopack
  // and Node’s external ESM loader (directory imports).
  serverExternalPackages: ["sharp"],
};

export default nextConfig;
