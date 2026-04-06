# NovelGit

NovelGit is a web app for managing long-form fiction in a **private GitHub repository**. The UI is a library, a **TipTap**-based editor with local drafts and GitHub sync, per-novel analytics, and PDF/DOCX export—while your manuscripts stay versioned as plain files you can also open locally (for example in Obsidian).

## Features

- **Landing page** (`/`) — marketing hero, then a **private library** gate: users enter the deployment passphrase (must match `AUTH_SECRET`) to unlock the app. Signed-in users see a short “Go to library” strip after the hero.
- **Library** (`/library`) — reads `config/novels.json` from the content repo and lists novels; create new novels and scaffold `content/<id>/…` via server actions. **Requires authentication** (same session as the editor).
- **Editor** (`/edit/[novelId]/[chapterSlug]`) — TipTap (Markdown) editor, debounced local drafts, sync to GitHub, chapter sidebar with drag-and-drop order stored in `meta.json`, and read/edit modes.
- **Analytics** (`/library/[novelId]/analytics`) — calendar heatmap from `content/<novelId>/analytics.json` (best-effort update on sync; failures do not block chapter saves).
- **Export** — `GET /api/export/[novelId]?format=pdf|docx` builds a combined manuscript in chapter order (also requires auth).
- **Auth** — Single-user passphrase. **`proxy.ts`** (Next.js route protection) gates **`/library`**, **`/edit`**, **`/admin`**, and **`/api/export/*`**. Server actions additionally call **`requireAuth()`**. Successful login sets an **opaque httpOnly session cookie** (HMAC-derived from `AUTH_SECRET`); legacy cookies that stored the raw secret are still accepted until users sign in again. Unauthenticated visitors only see the public hero; `/login` redirects to the home page sign-in section (`#private-library`).

## Stack

- [Next.js](https://nextjs.org/) 16 (App Router), React 19, TypeScript
- [Tailwind CSS](https://tailwindcss.com/) v4, [shadcn/ui](https://ui.shadcn.com/)-style components
- [Octokit](https://github.com/octokit/octokit.js) for GitHub Contents API
- [TipTap](https://tiptap.dev/) + `tiptap-markdown`, `@dnd-kit`, `@nivo/calendar`, `@react-pdf/renderer`, `docx`

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
| [docs/nextjs-coding-guide.md](docs/nextjs-coding-guide.md) | Next.js 16 / React 19 conventions for this repo |
| [docs/ui-ux.md](docs/ui-ux.md) | UI stack and patterns (some long sections describe earlier plans) |
| [docs/creative-ui-guide.md](docs/creative-ui-guide.md) | Creative UI notes |

This project targets **Next.js 16** APIs—see `node_modules/next/dist/docs/` for framework details that may differ from older Next.js versions.

## Deploying

Deploy on [Vercel](https://vercel.com/) or any Node host that supports Next.js. Set `GITHUB_TOKEN`, `GITHUB_REPO`, and `AUTH_SECRET` in the project environment. Pushing commits to the **content** repo may trigger your own workflows; the app itself commits via the API, so allow for GitHub rate limits and propagation when syncing.
