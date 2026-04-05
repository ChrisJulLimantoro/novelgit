# NovelGit — Partial Implementation Plan

**Document type:** Development roadmap (how and when)
**Companion spec:** `/docs/design-docs.md` (architecture, schema, features, security)
**Status key:**
- `[COMPLETE SPEC]` — design doc fully specifies what to build; implementation can proceed without design questions
- `[PARTIAL SPEC]` — design doc leaves open decisions; assumptions are noted and must be confirmed before starting

---

## Current implementation status (snapshot)

This section summarizes what exists in the repo **today** so the phase detail below stays useful as history without contradicting the codebase.

| Phase | Summary |
|-------|---------|
| **1 — Infrastructure** | Done: `lib/github.ts`, `lib/config.ts`, `middleware.ts` ( `/library`, `/edit`, `/admin`, `/api/export/*` ), `app/api/health/route.ts`, Tailwind v4 + app shell. Auth: passphrase on home page after hero (`#private-library`), `AUTH_SECRET` httpOnly cookie; `/login` redirects to `/#private-library`. **Note:** `app/page.tsx` is hero + private gate + footer, not a redirect to `/library`. |
| **2 — Library** | Done: `app/(main)/library/page.tsx`, `app/(main)/library/actions.ts`, `components/novels/*`, `lib/github-content.ts`, `types/novel.ts`. |
| **3 — Editor** | Done: `app/(editor)/edit/[novelId]/[chapterSlug]/`, CodeMirror client (`components/editor/*`), chapter sidebar + reorder persisting to `meta.json`, reader pane, local draft + sync actions. |
| **4 — Polish** | Done: `content/.../analytics.json` + heatmap (`app/(main)/library/[novelId]/analytics/page.tsx`), `lib/word-count.ts`, export `app/api/export/[novelId]/route.ts` + `lib/export-pdf.ts` / `lib/export-docx.ts`. |

**Not built (per design-docs):** lore/wiki wikilinks, multi-user OAuth. **`/admin`** is matched by middleware but may have no pages yet—add routes as needed.

Paths in the tables below use older shorthand (`app/library/...`); the live app uses `app/(main)/library/...` and `app/(editor)/edit/...`.

---

## Prerequisites

Before any phase begins:

1. Create a private GitHub repository to act as the content store. Note the owner and repo name (e.g. `your-username/novelgit-content`).
2. Generate a GitHub Personal Access Token (classic or fine-grained) with `contents: read/write` and `metadata: read` scopes.
3. Create a Vercel project connected to the Next.js app repository.
4. In Vercel project settings → Environment Variables, add:
   - `GITHUB_TOKEN` — the PAT from step 2
   - `GITHUB_REPO` — in the format `owner/repo-name`
   - `AUTH_SECRET` — a random secret string used by middleware (see Phase 1)

Seed the content repo with these files before running the app for the first time:

```
/config/novels.json          ← { "novels": [] }
/content/.gitkeep            ← empty placeholder
```

---

## Phase 1: Infrastructure `[COMPLETE SPEC]`

**Goal:** A running Next.js project that can authenticate to GitHub and render a styled shell page.

### Commands

```bash
npx create-next-app@latest novelgit \
  --typescript \
  --tailwind \
  --app \
  --no-src-dir \
  --import-alias "@/*"
cd novelgit
npm install octokit
```

> `next/font` is built into Next.js 16 — no separate install needed.

### Files to create

| Path | Purpose |
|------|---------|
| `app/layout.tsx` | Root layout; applies Tailwind base styles and loads serif font |
| `app/page.tsx` | Temporary landing page (redirect to `/library`) |
| `lib/github.ts` | Singleton Octokit instance; reads `GITHUB_TOKEN` from `process.env` |
| `lib/config.ts` | Constants: `GITHUB_REPO`, owner/repo split helper |
| `middleware.ts` | Protects `/edit` and `/admin` routes |
| `.env.local` | Local dev env vars (git-ignored) |

### Key implementation details

**`lib/github.ts`**
```ts
import { Octokit } from "octokit";
export const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
```

**`lib/config.ts`**
```ts
export const [REPO_OWNER, REPO_NAME] = (process.env.GITHUB_REPO ?? "").split("/");
```

**`middleware.ts`** — protect routes with a simple bearer check or `AUTH_SECRET` cookie. The design doc says "middleware protecting /edit and /admin" but does not specify the auth mechanism (see open question below).

**Tailwind serif font stack** — Tailwind v4 has no `tailwind.config.ts`. Configuration is done in CSS via `@theme` inside `globals.css`:

```css
@theme inline {
  --font-serif: Georgia, Cambria, "Times New Roman", serif;
}
```

Then use `font-serif` as a Tailwind utility class. To use a Google Font instead, load it with `next/font/google`, expose it as a CSS variable, and reference that variable in `@theme`:

```ts
// app/layout.tsx
import { Lora } from "next/font/google";
const lora = Lora({ subsets: ["latin"], variable: "--font-lora" });
// apply lora.variable to <html>
```
```css
/* globals.css */
@theme inline {
  --font-serif: var(--font-lora), Georgia, serif;
}
```

### Acceptance criteria

- [ ] `npm run dev` starts without errors
- [ ] `lib/github.ts` can call `octokit.rest.repos.get({ owner, repo })` and return repo metadata (verify via a temporary `app/api/health/route.ts` that you delete after)
- [ ] Visiting `/edit/anything` without credentials returns 401 or redirect
- [ ] Tailwind prose styles render at 720px max-width in a test component

### Open questions (must resolve before Phase 2)
- **Auth mechanism:** The spec says "secret key or Auth" but gives no further detail. Options: (a) hardcoded `AUTH_SECRET` cookie check in middleware (simplest, single-user), (b) NextAuth.js with GitHub OAuth (multi-user). Assumption: single-user secret key until clarified.

---

## Phase 2: Library Management `[COMPLETE SPEC]`

**Goal:** The `/library` page reads `novels.json` from GitHub and renders project cards. A "New Novel" button creates the folder scaffold and updates `novels.json`.

### Additional packages

```bash
npm install zod          # schema validation for novels.json
```

### Files to create

| Path | Purpose |
|------|---------|
| `app/library/page.tsx` | Server component; fetches and renders novel cards |
| `app/library/NewNovelButton.tsx` | Client component; opens modal, submits form |
| `app/library/actions.ts` | Server Actions: `getLibrary`, `createNovel` |
| `lib/github-content.ts` | Helpers: `getFile`, `putFile` (encapsulates SHA fetch + Base64 commit) |
| `types/novel.ts` | TypeScript types + Zod schema for `novels.json` |

### `lib/github-content.ts` — core sync logic

Implement two functions that all future Server Actions will call:

```ts
// Returns { content: string (decoded), sha: string }
export async function getFile(path: string): Promise<{ content: string; sha: string }>

// Commits new content; requires sha from a prior getFile call
export async function putFile(path: string, content: string, sha: string, message: string): Promise<void>
```

`putFile` must:
1. Convert `content` to Base64 (`Buffer.from(content).toString("base64")`)
2. Call `octokit.rest.repos.createOrUpdateFileContents` with `owner`, `repo`, `path`, `message`, `content` (Base64), and `sha`
3. Call `revalidatePath("/library")` after success

**Important:** Always call `getFile` immediately before `putFile` in the same Server Action invocation to get the latest SHA and avoid 409 conflicts. Never cache or reuse a SHA across requests.

### `app/library/actions.ts` — `createNovel` Server Action

When "New Novel" is submitted with `{ id, title, genre }`:

1. Call `getFile("config/novels.json")` to get current registry + SHA
2. Parse JSON, push new novel entry: `{ id, title, path: "content/${id}", status: "planning" }`
3. Call `putFile("config/novels.json", updatedJson, sha, "feat: add novel ${id}")`
4. Create stub files via individual `putFile` calls (no SHA needed for new files — pass `""`):
   - `content/${id}/meta.json` — `{ "id": "${id}", "title": "${title}", "genre": "${genre}", "goals": {} }`
   - `content/${id}/manuscript/.gitkeep`
   - `content/${id}/lore/.gitkeep`
5. Call `revalidatePath("/library")`

### Novel ID generation

Slugify the title: lowercase, replace spaces with `-`, strip non-alphanumeric. Confirm uniqueness against existing `novels.json` IDs before committing.

### Acceptance criteria

- [ ] `/library` renders a card for each entry in `config/novels.json`
- [ ] "New Novel" modal accepts title and optional genre
- [ ] After submission, the GitHub content repo contains the new folder structure
- [ ] After submission, `/library` shows the new card on next load (revalidation works)
- [ ] If `novels.json` is malformed, the page renders a graceful error state rather than crashing

---

## Phase 3: The Writer's Workspace `[PARTIAL SPEC]`

**Goal:** A `/edit/[novel-id]/[chapter-slug]` route with a Zen markdown editor, chapter sidebar with drag-and-drop reordering, and a Reader Mode.

**Why partial:** The spec defines the editor surface and autosave strategy clearly. The Chapter Sidebar drag-and-drop order persistence mechanism (does reordering commit a new file? update a `meta.json` field?) and Reader Mode rendering target are not specified.

### Additional packages

```bash
npm install @codemirror/lang-markdown @uiw/react-codemirror   # or alternative: react-simplemde-editor
npm install @dnd-kit/core @dnd-kit/sortable                    # drag-and-drop
npm install react-markdown remark-gfm                          # Reader Mode rendering
npm install use-debounce                                        # localStorage autosave debounce
```

### Files to create

| Path | Purpose |
|------|---------|
| `app/edit/[novelId]/[chapterSlug]/page.tsx` | Editor route (server component shell) |
| `app/edit/[novelId]/[chapterSlug]/EditorClient.tsx` | Client component; CodeMirror instance |
| `app/edit/[novelId]/[chapterSlug]/actions.ts` | Server Actions: `loadChapter`, `syncChapter` |
| `app/edit/[novelId]/ChapterSidebar.tsx` | Client component; lists + reorders chapters |
| `app/edit/[novelId]/ReaderMode.tsx` | Client component; renders markdown as prose |
| `lib/local-draft.ts` | Helpers: `saveDraft(key, content)`, `loadDraft(key)` using `localStorage` |

### Autosave strategy

- **LocalStorage key format:** `draft:${novelId}:${chapterSlug}`
- **Debounce delay:** 1500ms (saves after user stops typing)
- On editor mount: check `localStorage` for a draft newer than the fetched GitHub version (compare timestamps); prompt user to restore or discard if a stale draft is found
- On "Sync to GitHub" button click: call `syncChapter` Server Action, clear the localStorage draft on success

### `syncChapter` Server Action

1. Call `getFile("content/${novelId}/manuscript/${chapterSlug}.md")` for latest SHA
2. Call `putFile(path, editorContent, sha, "draft: update ${chapterSlug}")`
3. Call `revalidatePath("/edit/${novelId}/${chapterSlug}")`
4. Return `{ ok: true, timestamp: new Date().toISOString() }` — display in UI as "Synced at HH:MM"

### Chapter Sidebar — open design decisions (must resolve)

- **Order persistence:** Drag-and-drop visual order must be persisted. The simplest approach is to store chapter order in `content/[novel-id]/meta.json` as `{ "chapterOrder": ["01-intro", "02-chapter"] }`. This requires a Server Action `reorderChapters` that updates `meta.json`.
- **Chapter creation:** The sidebar needs a "New Chapter" button. The naming convention implied by the repo structure (`01-intro.md`) should be enforced.

### Sync UX (operational requirement from design doc)

The design doc explicitly states: "Sync triggers ~45s Vercel build — UI must manage this expectation."

Implement a `SyncStatusBanner` client component that:
- Shows "Syncing..." spinner immediately on button click
- Shows "Saved to GitHub. Page will refresh in ~45s." after the Server Action resolves
- Does not block the editor during sync

### Acceptance criteria

- [ ] Editor loads chapter content from GitHub on first visit
- [ ] Typing saves to `localStorage` within 2 seconds (debounce)
- [ ] "Sync to GitHub" button commits the file and shows a success timestamp
- [ ] Refreshing the page re-loads the committed content (not a stale cache)
- [ ] Drag-and-drop reorder in the sidebar persists after page refresh
- [ ] Reader Mode renders GFM markdown as styled prose at 720px, toggled without leaving the route
- [ ] Stale draft detection prompts the user correctly

---

## Phase 4: Polish `[PARTIAL SPEC]`

**Goal:** Word count analytics with writing heatmaps, and server-side export to PDF/Docx.

**Why partial:** The design doc names these features but specifies no data model for analytics persistence, no heatmap granularity, and no choice of export library.

### Sub-feature A: Word Count Analytics & Heatmaps

**Open decisions to resolve before starting:**
- Where is writing activity stored? GitHub commits provide a history, but parsing commit diffs for word counts is expensive. Recommended approach: store a `content/[novel-id]/analytics.json` file updated on each sync with `{ date: "YYYY-MM-DD", wordCount: N }` entries.
- Heatmap library: `react-calendar-heatmap` or `@nivo/calendar` are standard choices.

**Suggested files:**
- `app/library/[novelId]/analytics/page.tsx` — analytics dashboard
- `lib/word-count.ts` — `countWords(markdown: string): number` utility
- Extend `syncChapter` Server Action to append a word-count record to `analytics.json` on each sync

### Sub-feature B: Export to PDF/Docx

**Open decisions to resolve before starting:**
- PDF library: `@react-pdf/renderer` (JS, runs on Vercel) vs `puppeteer` (requires a separate serverless function or longer timeout). Puppeteer exceeds Vercel's default 10s function limit — use `@react-pdf/renderer` unless full CSS fidelity is required.
- Docx library: `docx` (npm) is the standard choice.

**Suggested files:**
- `app/api/export/[novelId]/route.ts` — GET endpoint; accepts `?format=pdf|docx`
- `lib/export-pdf.ts` — assembles chapters in order, renders with `@react-pdf/renderer`
- `lib/export-docx.ts` — assembles chapters in order, renders with `docx`

**Suggested packages:**
```bash
npm install @react-pdf/renderer
npm install docx
```

### Acceptance criteria (contingent on design decisions above)

- [ ] Each sync call records a timestamped word count to `analytics.json`
- [ ] Analytics page renders a calendar heatmap of daily word counts
- [ ] `/api/export/[novelId]?format=pdf` returns a downloadable PDF of all chapters in sidebar order
- [ ] `/api/export/[novelId]?format=docx` returns a downloadable Docx file

---

## Dependency & Sequencing Summary

```
Phase 1 (Infrastructure)
  └─ Phase 2 (Library) — depends on lib/github-content.ts from Phase 1
       └─ Phase 3 (Editor) — depends on novel + chapter scaffold from Phase 2
            └─ Phase 4 (Polish) — depends on sync logic + chapter order from Phase 3
```

All phases are strictly sequential. Do not start Phase N+1 until Phase N acceptance criteria pass.

---

## File tree (approximate current state)

```
novelgit/
├── app/
│   ├── layout.tsx
│   ├── page.tsx                          ← landing (hero), not a redirect
│   ├── login/
│   ├── api/
│   │   ├── health/route.ts
│   │   └── export/[novelId]/route.ts
│   ├── (main)/
│   │   ├── layout.tsx                    ← TopNav shell
│   │   └── library/
│   │       ├── page.tsx
│   │       ├── actions.ts
│   │       └── [novelId]/
│   │           ├── page.tsx
│   │           └── analytics/page.tsx
│   └── (editor)/
│       ├── layout.tsx
│       └── edit/[novelId]/[chapterSlug]/
│           ├── page.tsx
│           └── actions.ts
├── components/
│   ├── editor/                           ← editor-client, chapter-sidebar, reader-pane, …
│   ├── novels/
│   └── ui/
├── lib/
│   ├── github.ts
│   ├── github-content.ts
│   ├── config.ts
│   ├── local-draft.ts
│   ├── word-count.ts
│   ├── export-pdf.ts
│   └── export-docx.ts
├── types/
│   └── novel.ts
├── middleware.ts
├── .env.example                          ← committed template
└── .env.local                            ← git-ignored secrets
```
