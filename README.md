# NovelGit — AI-powered Novel Management

> Write freely. Your manuscripts live as plain Markdown in your own GitHub repository, version-controlled and readable in any editor. AI is layered on top — free to use, optional, and easy to turn off.

## What it is

NovelGit is a self-hosted web app for managing long-form fiction. It gives you a library, a rich editor (TipTap + GitHub sync), analytics, PDF/DOCX export, a structured world-bible (lore), and an AI chat assistant that knows both your lore notes **and** the actual text of your manuscript.

Everything is free to run:
- **GitHub** (free tier) stores all your content as plain `.md` files
- **Groq** (free tier) powers the LLM — scaffold lore entries and chat
- **OpenRouter** (free model) embeds manuscript chunks for semantic search
- **Voyage** (optional, paid) embeds lore entries for richer semantic search — degrades gracefully to keyword matching without it

---

## Features

- **Library** — list and manage novels; scaffold `content/<id>/…` in the content repo
- **Editor** — TipTap (Markdown), debounced local drafts, GitHub sync, drag-and-drop chapter order, read/edit modes, floating prev/next chapter bar
- **Lore / world-bible** — per-novel entries stored as `content/<novelId>/lore/*.md` with AI scaffold (generate a template from a name + type) and semantic search
- **AI Chat** — ask anything about your novel; retrieves relevant lore entries and manuscript excerpts simultaneously, combines both to answer
- **Analytics** — calendar heatmap of daily word counts
- **Export** — combined manuscript as PDF or DOCX, in chapter order
- **Auth** — single-user passphrase; session cookie; all writing routes protected

---

## AI & RAG

The AI assistant uses **Retrieval-Augmented Generation**: before calling the LLM it fetches the most relevant lore entries and manuscript excerpts and injects them into the system prompt.

### Lore RAG

Lore entries are short structured files (character, location, faction, event, item). Each entry is embedded via **Voyage AI** (`voyage-3`, 1024 dimensions) and stored in `content/{novelId}/lore-index.json`. At chat time the query is embedded and scored against all entries using cosine similarity + keyword + entity-hint bonuses ("who is X" patterns).

Requires `VOYAGE_API_KEY`. Without it, lore retrieval falls back to name/tag keyword matching.

### Manuscript RAG

Chapters are split into overlapping 400-character chunks (1-paragraph overlap so adjacent-paragraph attribution is preserved). Each chunk is embedded via **OpenRouter** (`nvidia/llama-nemotron-embed-vl-1b-v2:free`, 2048 dimensions) and stored in per-chapter shard files at `content/{novelId}/manuscript-rag-emb/{chapterSlug}.json`. Metadata (text, chapter title, chunk index) is stored separately in `manuscript-rag-index.json`.

At chat time:
1. **HyDE** — Groq generates a short hypothetical prose passage that would answer the query (bridges plot-summary language like "when kiyotaka confess" to first-person prose like "I love you")
2. The hypothesis is embedded and used for cosine similarity search
3. Hybrid scoring: embedding similarity + keyword hits + proper-noun VIP lane
4. Top 6 chunks returned

Requires `OPENROUTER_API_KEY`. Free — no credit card needed.

### How retrieval works

Both lore and manuscript context are **always retrieved simultaneously** and passed to the LLM together. The LLM combines both sources to answer. Neither source "wins" — the model decides how to weight them.

### Citation behaviour

- **Character / world-building questions** ("who is arisu", "what is class A's goal") — the LLM answers from both lore and manuscript context but does not surface chapter names or locations.
- **Scene / location questions** ("when does arisu confess", "which chapter does the swimming competition happen") — the LLM cites the chapter title.

### Reindex RAG

After writing or editing content, hit **Reindex RAG** in the editor AI sidebar to rebuild embeddings. You can also call `reindexChapter(novelId, slug)` from the editor to reindex a single chapter cheaply (1 API call to OpenRouter) without rebuilding everything.

---

## Stack

- **Next.js 16** (App Router), React 19, TypeScript
- **Tailwind CSS v4**, shadcn/ui-style components
- **Octokit** — GitHub Contents API for all content reads/writes
- **TipTap** + `tiptap-markdown`, `@dnd-kit`, `@nivo/calendar`, `@react-pdf/renderer`, `docx`
- **Groq SDK** (`llama-3.3-70b-versatile`) — LLM for scaffold + chat + HyDE query expansion
- **Voyage HTTP API** — lore embeddings (no `voyageai` npm SDK)
- **OpenRouter HTTP API** — manuscript embeddings (no SDK)
- **gray-matter** — lore frontmatter parsing

---

## Installation

### Step 1: Prerequisites

- Node.js 20+
- A **GitHub account** (free)
- A **Groq account** for a free API key — [console.groq.com](https://console.groq.com)
- An **OpenRouter account** for a free API key — [openrouter.ai/keys](https://openrouter.ai/keys)
- *(Optional)* A **Voyage AI account** for lore embeddings — [voyageai.com](https://www.voyageai.com)

### Step 2: Create the content repository

Create a **new private GitHub repository** (e.g. `my-novels-content`). This repo stores all your manuscripts and config — not the app code.

Seed it with two files:

**`config/novels.json`**
```json
{ "novels": [] }
```

**`content/.gitkeep`**
```
(empty file)
```

Then create a **Personal Access Token** with `Contents: Read and Write` + `Metadata: Read` permission scoped to this repository. Save the token — you'll need it in Step 4.

### Step 3: Clone and install

```bash
git clone https://github.com/your-username/novelgit.git
cd novelgit
npm install
```

### Step 4: Configure environment

Copy `.env.example` to `.env.local` and fill in your values:

```bash
cp .env.example .env.local
```

```env
# Required
GITHUB_TOKEN=ghp_...          # PAT from Step 2
GITHUB_REPO=owner/repo        # e.g. myuser/my-novels-content
AUTH_SECRET=your-passphrase   # anything you'll remember; used to log in

# AI — all optional but recommended
GROQ_API_KEY=gsk_...          # Groq free tier (LLM + HyDE)
OPENROUTER_API_KEY=sk-or-...  # OpenRouter free tier (manuscript embeddings)
VOYAGE_API_KEY=pa-...         # Voyage (lore embeddings — paid, optional)
```

### Step 5: Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Scroll past the hero and enter your passphrase to unlock the library and editor.

---

## Environment variables

| Variable | Required | Purpose |
|---|---|---|
| `GITHUB_TOKEN` | Yes | PAT for the content repository (`contents: read/write`, `metadata: read`) |
| `GITHUB_REPO` | Yes | `owner/repo` of the content store |
| `AUTH_SECRET` | Yes | Passphrase used to mint session cookies |
| `GROQ_API_KEY` | Recommended | LLM for scaffold, chat, and HyDE query expansion (free tier) |
| `OPENROUTER_API_KEY` | Recommended | Manuscript chunk embeddings — `nvidia/llama-nemotron-embed-vl-1b-v2:free` (free, no credit card) |
| `VOYAGE_API_KEY` | Optional | Lore entry embeddings — `voyage-3` via REST (paid, degrades to keyword search without it) |

Core writing and library features work with only the three required variables. AI features degrade gracefully when optional keys are absent.

---

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Next.js dev server |
| `npm run build` | Production build |
| `npm run start` | Run production server |
| `npm run lint` | ESLint |

---

## Deploying

Deploy on [Vercel](https://vercel.com/) or any Node host that supports Next.js. Set all environment variables in the project settings. The app commits content via the GitHub API — allow for rate limits when syncing many chapters.

`GET /api/health` calls `octokit.rest.repos.get` — use it to verify token and repo name after deployment.

---

## Documentation

| Doc | Contents |
|---|---|
| [docs/design-docs.md](docs/design-docs.md) | Architecture, content schema, data flow |
| [docs/spec/ai-rag-plan.md](docs/spec/ai-rag-plan.md) | Lore + RAG + AI routes (original spec) |
| [docs/nextjs-coding-guide.md](docs/nextjs-coding-guide.md) | Next.js 16 / React 19 conventions |
| [docs/ui-ux.md](docs/ui-ux.md) | UI stack and component patterns |

This project targets **Next.js 16** — see `node_modules/next/dist/docs/` for APIs that may differ from older versions.
