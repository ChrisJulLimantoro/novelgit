@AGENTS.md

## NovelGit (this repo)

Private **GitHub-backed** writing app: library, **TipTap** editor (`/edit/...`), analytics, export, optional **lore** under `content/{novelId}/lore/`, optional **AI**: Groq LLM; **lore** RAG = Voyage HTTPS [`lib/ai/embeddings.ts`](lib/ai/embeddings.ts). Manuscript RAG / local embeddings are **not used at runtime**; [`lib/ai/embeddings-local.ts`](lib/ai/embeddings-local.ts) is a stub (Xenova removed). Do not add the `voyageai` npm SDK.

**Auth:** [`proxy.ts`](proxy.ts) protects `/library`, `/edit`, `/admin`, `/api/export`. `/api/ai/*` checks cookies per route. [`lib/auth.ts`](lib/auth.ts) — opaque session cookie, `requireAuth()` for server actions.

**Env:** `GITHUB_TOKEN`, `GITHUB_REPO`, `AUTH_SECRET` required; `GROQ_API_KEY`, `VOYAGE_API_KEY` (lore only) optional. See [`.env.example`](.env.example).

**Specs:** [docs/design-docs.md](docs/design-docs.md), [docs/spec/ai-rag-plan.md](docs/spec/ai-rag-plan.md).

**Next.js:** This is **Next.js 16** — read `node_modules/next/dist/docs/` before relying on framework behavior from memory.
