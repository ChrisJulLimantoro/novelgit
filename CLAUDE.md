@AGENTS.md

## NovelGit (this repo)

AI-powered **GitHub-backed** novel management app: **library**, **TipTap** editor (`/edit/...`), **analytics**, **export**, per-novel **lore** under `content/{novelId}/lore/`, **Global Bible** at `content/{novelId}/global-summary.md` (AI-maintained; editable at `/edit/{novelId}/bible`), **Admin AI Settings** at `/admin` (persisted as `ai-config.json` in the **content** repo), and **AI chat** that injects Global Bible + **dual RAG** (lore + manuscript) when available.

### RAG & embeddings

- **Lore** — Default: **Voyage** `voyage-3` (1024-d) REST [`lib/ai/embeddings.ts`](lib/ai/embeddings.ts). Index: `content/{novelId}/lore-index.json`. Do not add the `voyageai` npm SDK.
- **Manuscript** — Default: **OpenRouter** `nvidia/llama-nemotron-embed-vl-1b-v2:free` (2048-d) REST [`lib/ai/embeddings-openrouter.ts`](lib/ai/embeddings-openrouter.ts). Metadata (and optional shards): `content/{novelId}/manuscript-rag-index.json` (+ `manuscript-rag-index-*.json`). Per-chapter embedding shards: `content/{novelId}/manuscript-rag-emb/{chapterSlug}.json`. Chunking: 400-char sliding window, 1-paragraph overlap [`lib/manuscript-rag.ts`](lib/manuscript-rag.ts).
- **Optional unified Gemini embeddings** — When `embeddingProvider === "gemini"` in [`ai-config.json`](types/ai-config.ts), reindex uses [`lib/ai/embeddings-gemini.ts`](lib/ai/embeddings-gemini.ts) for lore and manuscript batches. Requires `GEMINI_API_KEY`; full reindex after switching.
- [`lib/ai/embeddings-local.ts`](lib/ai/embeddings-local.ts) is a dead stub — do not use.

### Global Bible & distillation

- **Chapter distillation** — [`lib/ai/chapter-distillation.ts`](lib/ai/chapter-distillation.ts): Gemini REST [`lib/ai/gemini.ts`](lib/ai/gemini.ts); model from `ai-config.json` (`distillationModel`). Skipped if no `GEMINI_API_KEY`.
- **Global Bible** — [`lib/ai/global-bible.ts`](lib/ai/global-bible.ts): full rebuild and per-chapter patch; models `bibleRebuildModel`, `biblePatchModel`. Stored markdown: `content/{novelId}/global-summary.md` via [`lib/manuscript-rag.ts`](lib/manuscript-rag.ts) (`getGlobalBible`, `updateGlobalBible`).

### AI chat

- Route: [`app/api/ai/[novelId]/chat/route.ts`](app/api/ai/[novelId]/chat/route.ts). Loads Global Bible, lore context [`lib/ai/lore-chat-retrieval.ts`](lib/ai/lore-chat-retrieval.ts), manuscript context [`lib/ai/manuscript-chat-retrieval.ts`](lib/ai/manuscript-chat-retrieval.ts) (HyDE via Groq + embed via OpenRouter by default). Citation of chapter titles is conditional on query pattern (scene vs character/lore).
- **Reindex** — [`app/api/ai/[novelId]/reindex/route.ts`](app/api/ai/[novelId]/reindex/route.ts), manuscript pipeline [`lib/ai/manuscript-reindex.ts`](lib/ai/manuscript-reindex.ts).

### Configuration

- **Content repo** — [`lib/ai/ai-config.ts`](lib/ai/ai-config.ts) reads/writes `ai-config.json` at repo root. Schema [`types/ai-config.ts`](types/ai-config.ts).
- **Auth** — [`proxy.ts`](proxy.ts) protects `/library`, `/edit`, `/admin`, `/api/export`. `/api/ai/*` checks cookies per route. [`lib/auth.ts`](lib/auth.ts) — opaque session cookie, `requireAuth()` for server actions.
- **Env** — `GITHUB_TOKEN`, `GITHUB_REPO`, `AUTH_SECRET` required; `GROQ_API_KEY`, `OPENROUTER_API_KEY`, `VOYAGE_API_KEY`, `GEMINI_API_KEY` optional. See [`.env.example`](.env.example).

### Specs

[docs/design-docs.md](docs/design-docs.md), [docs/spec/ai-rag-plan.md](docs/spec/ai-rag-plan.md).

### Next.js

This is **Next.js 16** — read `node_modules/next/dist/docs/` before relying on framework behavior from memory.
