@AGENTS.md

## NovelGit (this repo)

AI-powered **GitHub-backed** writing app: library, **TipTap** editor (`/edit/...`), analytics, export, **lore** world-bible under `content/{novelId}/lore/`, and **dual RAG AI chat** using both lore and manuscript context simultaneously.

**RAG architecture:**
- **Lore RAG** — Voyage `voyage-3` (1024-d) via HTTPS REST [`lib/ai/embeddings.ts`](lib/ai/embeddings.ts). Index at `content/{novelId}/lore-index.json`. Do not add the `voyageai` npm SDK.
- **Manuscript RAG** — OpenRouter `nvidia/llama-nemotron-embed-vl-1b-v2:free` (2048-d) via HTTPS REST [`lib/ai/embeddings-openrouter.ts`](lib/ai/embeddings-openrouter.ts). Metadata index at `content/{novelId}/manuscript-rag-index.json`. Per-chapter embedding shards at `content/{novelId}/manuscript-rag-emb/{chapterSlug}.json`. Chunking: 400-char sliding window with 1-paragraph overlap. HyDE query expansion via Groq at chat time.
- [`lib/ai/embeddings-local.ts`](lib/ai/embeddings-local.ts) is a dead stub (Xenova removed) — do not use or reference it.
- Both RAG sources are always retrieved and passed to the LLM together. Citation of chapter locations is conditional on the query pattern (scene queries vs. character/lore queries) — see `app/api/ai/[novelId]/chat/route.ts`.

**Auth:** [`proxy.ts`](proxy.ts) protects `/library`, `/edit`, `/admin`, `/api/export`. `/api/ai/*` checks cookies per route. [`lib/auth.ts`](lib/auth.ts) — opaque session cookie, `requireAuth()` for server actions.

**Env:** `GITHUB_TOKEN`, `GITHUB_REPO`, `AUTH_SECRET` required; `GROQ_API_KEY`, `OPENROUTER_API_KEY`, `VOYAGE_API_KEY` optional. See [`.env.example`](.env.example).

**Specs:** [docs/design-docs.md](docs/design-docs.md), [docs/spec/ai-rag-plan.md](docs/spec/ai-rag-plan.md).

**Next.js:** This is **Next.js 16** — read `node_modules/next/dist/docs/` before relying on framework behavior from memory.
