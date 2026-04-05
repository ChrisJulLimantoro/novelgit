# NovelGit

NovelGit is a web app for managing long-form fiction in a **private GitHub repository**. The UI is a library, a markdown editor with local drafts and GitHub sync, per-novel analytics, and PDF/DOCX export—while your manuscripts stay versioned as plain files you can also open locally (for example in Obsidian).

## Features

- **Landing page** (`/`) — marketing-style hero with links into the app.
- **Library** (`/library`) — reads `config/novels.json` from the content repo and lists novels; create new novels and scaffold `content/<id>/…` via server actions.
- **Editor** (`/edit/[novelId]/[chapterSlug]`) — CodeMirror markdown editor, debounced local drafts, sync to GitHub, chapter sidebar with drag-and-drop order stored in `meta.json`, and a read/edit toggle.
- **Analytics** (`/library/[novelId]/analytics`) — calendar heatmap from `content/<novelId>/analytics.json` (updated on sync).
- **Export** — `GET /api/export/[novelId]?format=pdf|docx` builds a combined manuscript in chapter order.
- **Auth** — single-user passphrase (`AUTH_SECRET`); middleware protects `/edit` and `/admin` only. `/library` is public unless you change routing.

## Stack

- [Next.js](https://nextjs.org/) 16 (App Router), React 19, TypeScript
- [Tailwind CSS](https://tailwindcss.com/) v4, [shadcn/ui](https://ui.shadcn.com/)-style components
- [Octokit](https://github.com/octokit/octokit.js) for GitHub Contents API
- CodeMirror, `@dnd-kit`, `@nivo/calendar`, `@react-pdf/renderer`, `docx`

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
| `GITHUB_REPO` | `owner/repo` of the content store |
| `AUTH_SECRET` | Passphrase for the login cookie; must match what users type on `/login` |

Optional: `GET /api/health` calls `octokit.rest.repos.get`—use it to verify token and repo name in deployment.

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Visit `/library` to see the dashboard; open `/edit/...` after signing in at `/login`.

### Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Next.js dev server |
| `npm run build` | Production build |
| `npm run start` | Run production server |
| `npm run lint` | ESLint |

## Documentation

| Doc | Contents |
|-----|----------|
| [docs/design-docs.md](docs/design-docs.md) | Architecture, content schema, roadmap |
| [docs/spec/implementation-plan.md](docs/spec/implementation-plan.md) | Phased plan and file layout (historical + status) |
| [docs/nextjs-coding-guide.md](docs/nextjs-coding-guide.md) | Next.js 16 / React 19 conventions for this repo |
| [docs/ui-ux.md](docs/ui-ux.md) | UI stack and patterns |

This project targets **Next.js 16** APIs—see `node_modules/next/dist/docs/` for framework details that may differ from older Next.js versions.

## Deploying

Deploy on [Vercel](https://vercel.com/) or any Node host that supports Next.js. Set `GITHUB_TOKEN`, `GITHUB_REPO`, and `AUTH_SECRET` in the project environment. Pushing commits to the **content** repo may trigger your own workflows; the app itself commits via the API, so allow for GitHub rate limits and propagation when syncing.
