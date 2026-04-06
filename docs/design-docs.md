---

# Design document: NovelGit

**Project status:** Core product implemented (library, editor, sync, analytics, export). Lore/wiki linking and multi-user auth are not implemented.

**Target environment:** Vercel (Next.js) + GitHub Contents API

## 1. Executive summary

**NovelGit** is a private novel management system: a writer manages multiple literary projects through one web UI. **GitHub is the database**—prose and config live in a repository as Markdown and JSON, so work stays version-controlled and portable. The app is a GUI on top of that repo: server actions use **Octokit** to read and write files; **Next.js 16** (App Router) renders the UI.

---

## 2. System architecture

Decoupled **Git-CMS** pattern:

- **Frontend:** Next.js 16 (App Router), React 19, Tailwind v4.
- **Storage:** A GitHub repository containing manuscripts and configuration.
- **Write path:** Next.js Server Actions + Octokit (`createOrUpdateFileContents`). Updates use the latest file SHA per request to reduce 409 conflicts.
- **Local editing:** The same repo can be cloned and edited offline (for example in Obsidian); web sync and local Git workflows coexist with the usual merge/conflict caveats.

**Route protection:** `proxy.ts` implements the same role as classic `middleware` (Next.js 16 naming). It runs on matched paths and redirects unauthenticated users to `/` with `?from=…`.

**Route groups (implementation):**

- `app/page.tsx` — public marketing hero, then passphrase form for the **private library** (or a “Go to library” CTA when already signed in).
- `app/(main)/` — shell with top nav: library and novel subroutes under `app/(main)/library/` (all require auth + server-side checks).
- `app/(editor)/` — full-height editor layout for `app/(editor)/edit/[novelId]/[chapterSlug]/`.
- `app/unauthorized.tsx` — fallback UI when `requireAuth()` calls `unauthorized()`.

---

## 3. Data schema and file structure

### Repository layout

```text
/config
  novels.json          ← Library registry (source of truth for the dashboard)
/content
  /[novel-id]
    /manuscript        ← Chapter .md files (e.g. 01-intro.md)
    /lore              ← World-building .md (scaffolded; advanced wiki features TBD)
    meta.json          ← Title, genre, chapterOrder, etc.
    analytics.json     ← Daily word-count entries for heatmap (best-effort on sync)
```

### `novels.json` (library registry)

Updated via the web UI when creating novels. Shape matches the Zod schema in `types/novel.ts`.

---

## 4. Key functional features

### Library dashboard

- Reads `config/novels.json` from GitHub and renders project cards.
- **New Novel** creates folder scaffold and appends the registry entry.

### Zen editor

- **TipTap** WYSIWYG with Markdown storage (`tiptap-markdown`), typography and character-count extensions, and a reader-oriented view.
- **Local:** Debounced draft in `localStorage` (see `lib/local-draft.ts`).
- **Cloud:** Explicit sync commits the chapter file via GitHub API; analytics update is wrapped so failures log a warning and **do not** fail the chapter sync.

### Analytics

- Per-novel page reads `content/[novelId]/analytics.json` and renders a calendar heatmap (`@nivo/calendar`).

### Export

- `GET /api/export/[novelId]?format=pdf|docx` — chapters assembled in `meta.json` chapter order; requires the same session cookie as the rest of the app.

### Integrated wiki (world bible)

- **Planned:** Scoped lore and `[[wikilinks]]` as described in earlier revisions are **not** implemented yet; `lore/` is created for future use.

---

## 5. Technical notes

### Sync flow (server actions)

1. **Fetch:** `getFile` returns content and `sha` from the GitHub API.
2. **Update:** Content encoded as Base64 for `createOrUpdateFileContents`.
3. **Revalidate:** `revalidatePath` for affected routes after successful writes.

Always obtain a fresh `sha` with `getFile` immediately before `putFile` in the same action when updating an existing file.

### Security and access

- **Environment:** `GITHUB_TOKEN`, `GITHUB_REPO`, `AUTH_SECRET` (see `.env.example` and README). `GITHUB_REPO` is validated at startup (`assertGithubRepoConfigured` in `lib/config.ts` / `lib/github.ts`).
- **Route gate:** `proxy.ts` matcher covers `/library`, `/edit`, `/admin`, `/api/export/*`. Unauthenticated users are redirected to `/` with `?from=…`; the client can scroll to **`#private-library`** when `from` is present.
- **Session:** On successful login, `auth_token` is an **opaque** value (HMAC of a random session id with `AUTH_SECRET`), not the passphrase itself. Legacy cookies that equal `AUTH_SECRET` are still accepted for migration. httpOnly, SameSite=lax, 30-day expiry.
- **Defense in depth:** Server actions (`getLibrary`, `createNovel`, `updateNovel`, edit actions, etc.) call **`requireAuth()`**; export `GET` checks **`isValidAuthCookie`**.
- **Path safety:** `novelId` and `chapterSlug` are validated against strict patterns (`lib/ids.ts`) before building GitHub paths.
- **Redirects:** Post-login `from` is validated as an internal path only (`lib/safe-redirect.ts`).
- **Public surface:** The hero and marketing copy on `/` stay public; library, editor, and export require a session. Legacy `/login` redirects to the home-page sign-in anchor.

---

## 6. Roadmap (maintenance view)

| Area | Status |
|------|--------|
| Next.js + Tailwind + Octokit wiring | Done |
| Library + `novels.json` + novel scaffold | Done |
| Editor + local draft + GitHub sync + chapter order | Done |
| Reader / edit toggle in editor | Done |
| Analytics + heatmap + `analytics.json` on sync | Done |
| PDF / DOCX export | Done |
| Passphrase + opaque session + `proxy` + `requireAuth` for protected routes | Done |
| Lore wiki + bidirectional `[[links]]` | Not started |
| Multi-user auth (e.g. OAuth) | Not started |

---

## 7. Operational notes

- **Deploy latency:** A full site redeploy on Vercel is separate from GitHub file updates via the API; sync UI copy does not promise an automatic full page refresh.
- **Conflicts:** If editing from multiple clients, always refresh from GitHub (or rely on the editor’s load path) before syncing; the server uses the latest SHA when committing.
