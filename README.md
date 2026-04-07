# NovelGit

NovelGit is a web app for managing long-form fiction in a **private GitHub repository**. The UI includes a library, a **TipTap**-based editor with local drafts and GitHub sync, per-novel analytics, PDF/DOCX export, optional **lore / world-bible** files in the repo, and optional **AI** (Groq LLM + **Voyage embeddings for lore RAG** in chat)—while your manuscripts stay versioned as plain files you can also open locally (for example in Obsidian).

## Features

- **Landing page** (`/`) — marketing hero, then a **private library** gate: users enter the deployment passphrase (must match `AUTH_SECRET`) to unlock the app. Signed-in users see a short “Go to library” strip after the hero.
- **Library** (`/library`) — reads `config/novels.json` from the content repo and lists novels; create new novels and scaffold `content/<id>/…` via server actions. **Requires authentication** (same session as the editor).
- **Editor** (`/edit/[novelId]/[chapterSlug]`) — TipTap (Markdown) editor, debounced local drafts, sync to GitHub, chapter sidebar with drag-and-drop order stored in `meta.json`, read/edit modes, and a **floating prev/next chapter bar** in read mode.
- **Lore** (`/library/[novelId]/lore`) — manage per-novel lore entries stored as Markdown under `content/<novelId>/lore/` with `lore-index.json` for metadata and embeddings (when AI is configured).
- **AI (optional)** — `GROQ_API_KEY` for LLM (scaffold + chat). **`VOYAGE_API_KEY`** for **lore** embeddings (Voyage REST in [`lib/ai/embeddings.ts`](lib/ai/embeddings.ts)). Chat retrieval uses **lore only**; run **Reindex RAG** in the editor after changing lore so `lore-index.json` stays embedded. Manuscript RAG / local embedding code paths are **disabled at runtime** ([`lib/ai/embeddings-local.ts`](lib/ai/embeddings-local.ts) is a stub; `@xenova/transformers` is not a dependency).
- **Analytics** (`/library/[novelId]/analytics`) — calendar heatmap from `content/<novelId>/analytics.json` (best-effort update on sync; failures do not block chapter saves).
- **Export** — `GET /api/export/[novelId]?format=pdf|docx` builds a combined manuscript in chapter order (also requires auth).
- **Auth** — Single-user passphrase. **`proxy.ts`** (Next.js route protection) gates **`/library`**, **`/edit`**, **`/admin`**, and **`/api/export/*`**. **`/api/ai/*`** routes validate the session cookie inside each handler. Server actions call **`requireAuth()`**. Successful login sets an **opaque httpOnly session cookie** (HMAC-derived from `AUTH_SECRET`); legacy cookies that stored the raw secret are still accepted until users sign in again. Unauthenticated visitors only see the public hero; `/login` redirects to the home page sign-in section (`#private-library`).

## Stack

- [Next.js](https://nextjs.org/) 16 (App Router), React 19, TypeScript
- [Tailwind CSS](https://tailwindcss.com/) v4, [shadcn/ui](https://ui.shadcn.com/)-style components
- [Octokit](https://github.com/octokit/octokit.js) for GitHub Contents API
- [TipTap](https://tiptap.dev/) + `tiptap-markdown`, `@dnd-kit`, `@nivo/calendar`, `@react-pdf/renderer`, `docx`
- [Groq SDK](https://github.com/groq/groq-typescript) (`groq-sdk`) for LLM calls; **gray-matter** for lore front matter; Voyage HTTP API for lore embeddings (no `voyageai` npm SDK)

## Prerequisites

1. A **GitHub repository** that will hold all content (manuscripts, config). Note `owner/repo`.
2. A **Personal Access Token** with `contents: read/write` and `metadata: read` (classic or fine-grained).
3. **Seed** the repo before first run (paths are relative to the repo root):

   ```text
   config/novels.json   → { "novels": [] }
   content/.gitkeep       → empty placeholder (or any file so `content/` exists)
   ```

## Environment variables

Create `.env.local` in the project root (see `.env.example`). Vercel (or your host) should define the same variables.

| Variable | Purpose |
|----------|---------|
| `GITHUB_TOKEN` | PAT for the content repository |
| `GITHUB_REPO` | `owner/repo` of the content store (validated at startup; must be exactly two path segments) |
| `AUTH_SECRET` | Passphrase users type on the home page (after the hero); used to verify login and mint session tokens |
| `GROQ_API_KEY` | Optional — AI lore scaffold and chat (`llama-3.3-70b-versatile` via Groq) |
| `VOYAGE_API_KEY` | Optional — **lore** embeddings for semantic search and chat RAG (`voyage-3` via `https://api.voyageai.com/v1/embeddings`) |

Without `GROQ_API_KEY`, scaffold/chat LLM calls fail. Without `VOYAGE_API_KEY`, editor **searchLore** falls back to name/tag matching, and **Reindex RAG** cannot embed lore entries (Voyage is required for lore vectors). Chat uses retrieved lore only when embeddings exist. Core writing and library features work without AI keys.

Optional: `GET /api/health` calls `octokit.rest.repos.get`—use it to verify token and repo name in deployment.

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Scroll past the hero and enter your passphrase to unlock **Library** and **Editor**. Visiting `/library` without a session redirects to `/?from=…` on the home page (scrolls to the sign-in block when `from` is set).

### Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Next.js dev server (see `package.json` for flags) |
| `npm run build` | Production build |
| `npm run start` | Run production server |
| `npm run lint` | ESLint |

## Documentation

| Doc | Contents |
|-----|----------|
| [docs/design-docs.md](docs/design-docs.md) | Architecture, content schema, roadmap |
| [docs/spec/implementation-plan.md](docs/spec/implementation-plan.md) | Phased plan and file layout (historical + status) |
| [docs/spec/ai-rag-plan.md](docs/spec/ai-rag-plan.md) | Lore + RAG + AI routes |
| [docs/nextjs-coding-guide.md](docs/nextjs-coding-guide.md) | Next.js 16 / React 19 conventions for this repo |
| [docs/ui-ux.md](docs/ui-ux.md) | UI stack and patterns (some long sections describe earlier plans) |
| [docs/creative-ui-guide.md](docs/creative-ui-guide.md) | Creative UI notes |

This project targets **Next.js 16** APIs—see `node_modules/next/dist/docs/` for framework details that may differ from older Next.js versions.

## Deploying

Deploy on [Vercel](https://vercel.com/) or any Node host that supports Next.js. Set `GITHUB_TOKEN`, `GITHUB_REPO`, and `AUTH_SECRET` in the project environment. Add `GROQ_API_KEY` / `VOYAGE_API_KEY` as needed for LLM and lore semantics. **Reindex RAG** only calls Voyage for lore; typical runs are short. Pushing commits to the **content** repo may trigger your own workflows; the app itself commits via the API, so allow for GitHub rate limits and propagation when syncing.
