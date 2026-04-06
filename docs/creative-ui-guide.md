# Creative UI Guide — NovelGit

**Purpose:** This doc defines the creative direction for UI improvements beyond the baseline spec in `ui-ux.md`. Pick one of the three themes below and follow the implementation patterns section.

---

## Design Intent

| Dimension | Value |
|---|---|
| **Emotional tone** | Intimate, craft-forward, calm — a writer's private study |
| **Audience** | Technical writers who value precision and aesthetic restraint |
| **Visual anchor** | The novel card — the primary surface the user sees first |

The existing parchment + ink-blue palette is correct. The opportunity is in **surface texture**, **motion**, and **information density** inside each component — not in changing colors.

---

## Three Theme Options

### A — "The Study" (Warm Editorial)
**Best if:** You want the library to feel rich and tactile without being loud.

Cards become editorial blocks with a colored header strip (tinted by status), stats row beneath the title, and a subtle lift on hover. The background gets a CSS noise grain at 4% opacity. This is the closest to what already exists — an evolution, not a revolution.

**Implementation changes:**
1. `NovelCard` — add gradient header strip, word count + chapter count row
2. `globals.css` — add `@noise-bg` pseudo-element utility
3. `TopNav` — ink-tinted bottom border, logo with dot-accent
4. Empty state — display-size "0" numeral + descriptive copy + CTA
5. Motion — card `translateY(-4px)` + shadow deepen on hover (150ms ease-out)

---

### B — "Focused Ink" (Dense Dark-First)
**Best if:** You want the tool to feel like a focused writing instrument — closer to iA Writer or a code editor than a book shelf.

Library switches to a full-width list layout. Cards become compact rows showing title, status chip, last-commit date, and word count on one line. Dark mode is the de facto primary experience. Chapter sidebar gets numbered chapter rows with a left-border active indicator.

**Implementation changes:**
1. `LibraryPage` — replace grid with `flex flex-col gap-1` list
2. `NovelCard` — horizontal layout: title left, metadata right
3. `ChapterSidebar` — numbered rows, left border active indicator
4. `editor-client.tsx` toolbar — icon-only buttons using `Tooltip` for labels
5. `globals.css` — `--leading-tighter: 1.4` for metadata rows

---

### C — "Living Library" (Bento + Expressive States)
**Best if:** You want the library to be the most visually interesting screen and the empty state to delight rather than disappoint.

First novel card spans 2 columns (bento asymmetry). Each card gets a 3px left status border. A progress bar shows chapters written vs total. Empty state gets an inline SVG quill and a scale-in entrance animation.

**Implementation changes:**
1. `LibraryGrid` — first card gets `md:col-span-2` and larger title size
2. `NovelCard` — `border-l-3` in status color, progress bar component
3. Empty state — inline SVG + scale-in via `@keyframes scaleIn`
4. `StatusBadge` — filled soft variants (not outline-only)
5. `NovelCard` — "Open" becomes full-width `<Button variant="ghost">` at card bottom

---

## Token Additions (apply to any theme)

Add these to `app/globals.css` inside `:root` and `.dark`:

```css
/* Motion durations — consistent across all components */
:root {
  --duration-fast:    100ms;
  --duration-base:    150ms;
  --duration-slow:    250ms;
  --ease-out:         cubic-bezier(0.16, 1, 0.3, 1);
  --ease-spring:      cubic-bezier(0.34, 1.56, 0.64, 1);

  /* Card hover lift */
  --card-hover-shadow: 0 8px 24px rgb(0 0 0 / 0.12);
  --card-hover-lift:   translateY(-3px);

  /* Status fill variants (soft background for filled badges) */
  --status-planning-bg: oklch(from var(--status-planning) l c h / 0.08);
  --status-writing-bg:  oklch(from var(--status-writing)  l c h / 0.08);
  --status-editing-bg:  oklch(from var(--status-editing)  l c h / 0.08);
  --status-complete-bg: oklch(from var(--status-complete) l c h / 0.08);
}
```

---

## Spacing System

All structural spacing uses the 8px grid. Use these Tailwind classes:

| Value | Tailwind | Usage |
|---|---|---|
| 4px | `gap-1` `p-1` | Icon padding, hairline gaps |
| 8px | `gap-2` `p-2` | Related elements |
| 16px | `gap-4` `p-4` | Component padding |
| 24px | `gap-6` `p-6` | Section subdivision |
| 32px | `gap-8` `p-8` | Component separation |
| 48px | `py-12` | Section separation |
| 64px | `py-16` | Major layout divisions |

Never use arbitrary values like `py-10` for structural layout. `py-10` = 40px (not on the 8px grid) — prefer `py-8` (32px) or `py-12` (48px).

---

## Typography Rules

| Role | Class | Font |
|---|---|---|
| Display | `font-serif text-6xl font-bold leading-tight` | Lora |
| Page heading | `font-serif text-3xl font-semibold` | Lora |
| Card title | `font-serif text-xl font-medium` | Lora |
| Body | `font-sans text-base` | Geist Sans |
| Metadata / caption | `font-mono text-xs text-[var(--text-muted)]` | Geist Mono |
| Sidebar labels | `font-sans text-xs font-semibold uppercase tracking-wider` | Geist Sans |

**Rule:** Serif for content-facing titles and prose. Sans for UI chrome. Mono for metadata (word counts, dates, chapter numbers) — gives data a precise, technical feel that fits the git-backed nature of the app.

---

## Motion Spec

All transitions animate `transform` and `opacity` only.

| Trigger | Effect | Duration | Easing |
|---|---|---|---|
| Card hover | `translateY(-3px)` + shadow deepen | 150ms | ease-out |
| Card press | `scale(0.98)` | 80ms | ease-in |
| Button hover | background shift | 100ms | ease-out |
| Dialog appear | fade + `translateY(8px → 0)` | 200ms | ease-out |
| Sync banner appear | `translateY(100% → 0)` (already done) | 200ms | ease-out |
| Empty state enter | `scale(0.95 → 1)` + fade | 300ms | spring |
| Chapter active | left-border expand | 150ms | ease-out |

```css
/* Paste into globals.css */
@keyframes scaleIn {
  from { transform: scale(0.95); opacity: 0; }
  to   { transform: scale(1);    opacity: 1; }
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## Component Patterns

### NovelCard (Theme A version)

```tsx
// Gradient strip colors per status — add to statusClasses in novel-card.tsx
const statusGradients: Record<Novel["status"], string> = {
  planning: "from-[var(--parchment-200)] to-[var(--parchment-100)]",
  writing:  "from-emerald-100 to-[var(--parchment-100)]",
  editing:  "from-[var(--ink-100)] to-[var(--parchment-100)]",
  complete: "from-purple-100 to-[var(--parchment-100)]",
};

// Card structure
<Card className="group overflow-hidden transition-all duration-150 ease-out hover:-translate-y-[3px] hover:shadow-[var(--card-hover-shadow)]">
  {/* Status-tinted header strip */}
  <div className={`h-1.5 bg-gradient-to-r ${statusGradients[novel.status]}`} />
  <CardHeader className="pb-2">
    <CardTitle className="font-serif text-xl leading-snug">{novel.title}</CardTitle>
    <StatusBadge status={novel.status} />
  </CardHeader>
  <CardContent className="flex items-center justify-between">
    {/* Metadata row in monospace */}
    <span className="font-mono text-xs text-[var(--text-muted)]">
      {novel.wordCount?.toLocaleString() ?? "—"} words · {novel.chapterCount ?? 0} ch
    </span>
    <Link href={`/library/${novel.id}`} className="text-sm text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors">
      Open →
    </Link>
  </CardContent>
</Card>
```

### NovelCard (Theme B — list row version)

```tsx
<Link href={`/library/${novel.id}`} className="group flex items-center gap-4 px-4 py-3 rounded-lg hover:bg-[var(--bg-sidebar)] transition-colors duration-100">
  <div className="flex-1 min-w-0">
    <span className="font-serif text-base font-medium truncate">{novel.title}</span>
  </div>
  <StatusBadge status={novel.status} />
  <span className="font-mono text-xs text-[var(--text-muted)] shrink-0">
    {novel.wordCount?.toLocaleString() ?? "—"} words
  </span>
  <span className="font-mono text-xs text-[var(--text-muted)] shrink-0 w-24 text-right">
    {novel.lastCommitAt ? new Date(novel.lastCommitAt).toLocaleDateString() : "—"}
  </span>
</Link>
```

### NovelCard (Theme C — bento version)

```tsx
// In LibraryGrid, first card gets special treatment
{library.novels.map((novel, i) => (
  <NovelCard key={novel.id} novel={novel} featured={i === 0} />
))}

// In NovelCard
<Card className={cn(
  "group border-l-4 transition-all duration-150 hover:shadow-[var(--card-hover-shadow)]",
  statusBorderColors[novel.status],
  featured && "md:col-span-2"
)}>
```

### Expressive Empty State

```tsx
function EmptyLibrary() {
  return (
    <div
      className="text-center py-24 flex flex-col items-center gap-6"
      style={{ animation: "scaleIn 300ms cubic-bezier(0.34, 1.56, 0.64, 1) both" }}
    >
      {/* Inline SVG quill — no external dependency */}
      <svg width="64" height="64" viewBox="0 0 64 64" fill="none" className="text-[var(--text-muted)] opacity-40">
        <path d="M52 4C52 4 44 12 36 24C28 36 28 52 28 52C28 52 36 44 44 36C52 28 60 20 52 4Z" stroke="currentColor" strokeWidth="2" fill="none"/>
        <path d="M28 52L12 60" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        <path d="M36 24L20 40" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 3" opacity="0.6"/>
      </svg>
      <div>
        <p className="font-serif text-2xl font-medium text-[var(--text-primary)] mb-1">No novels yet</p>
        <p className="text-sm text-[var(--text-muted)] max-w-[32ch] mx-auto leading-relaxed">
          Every great story starts somewhere. Create your first novel to begin.
        </p>
      </div>
      <NewNovelDialog />
    </div>
  );
}
```

### ChapterSidebar — numbered rows (Themes B & C)

```tsx
// Replace the slug display in SortableChapter
<span className="font-mono text-xs text-[var(--text-muted)] w-5 shrink-0 select-none">
  {String(index + 1).padStart(2, "0")}
</span>
<Link href={`/edit/${novelId}/${slug}`} className="flex-1 truncate capitalize">
  {slug.replace(/^\d+-/, "").replace(/-/g, " ")}
</Link>
```

### Editor Toolbar — icon-only (Theme B)

```tsx
import { Eye, EyeOff, GitBranch } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

// Read/Edit toggle
<Tooltip>
  <TooltipTrigger asChild>
    <button onClick={() => setReaderMode(m => !m)} aria-pressed={readerMode}
      className="p-2 rounded-md border border-[var(--border-default)] hover:bg-[var(--bg-sidebar)] transition-colors">
      {readerMode ? <EyeOff size={16} /> : <Eye size={16} />}
    </button>
  </TooltipTrigger>
  <TooltipContent>{readerMode ? "Edit mode" : "Reader mode"} (⌘⇧R)</TooltipContent>
</Tooltip>

// Sync button
<Tooltip>
  <TooltipTrigger asChild>
    <button onClick={handleSync} disabled={syncState === "syncing"}
      className="p-2 rounded-md bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] disabled:opacity-50 transition-colors">
      <GitBranch size={16} />
    </button>
  </TooltipTrigger>
  <TooltipContent>Sync to GitHub (⌘S)</TooltipContent>
</Tooltip>
```

---

## Noise Texture (Theme A)

Add to `globals.css` — gives backgrounds a subtle tactile paper quality:

```css
/* Noise grain overlay — 4% opacity on bg-base */
body::before {
  content: "";
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 9999;
  opacity: 0.04;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
  background-size: 200px 200px;
}
```

---

## TipTap Editor (WYSIWYG — replaces CodeMirror)

The editor is now TipTap v3 with `tiptap-markdown` for markdown serialization. It renders rich text natively (bold = bold, headings are large, etc.) and saves to `.md` files on GitHub.

**Packages:** `@tiptap/react @tiptap/pm @tiptap/starter-kit tiptap-markdown @tiptap/extension-placeholder @tiptap/extension-typography @tiptap/extension-character-count`

**Modes:**
- **Read mode** (default): `editor.setEditable(false)` — clean document view, default cursor, no toolbar formatting controls
- **Edit mode**: `editor.setEditable(true)` — full formatting toolbar, text cursor, autosave active

**Markdown roundtrip:**
- Load: `editor.commands.setContent(markdownString, { emitUpdate: false })`
- Save: `(editor.storage as any).markdown.getMarkdown()`

**Dark mode:** Handled automatically via `prose dark:prose-invert` + CSS variable overrides in `globals.css`. No separate theme config needed.

**Key files:**
- `components/editor/editor-client.tsx` — TipTap `useEditor` hook, read/edit toggle, autosave, sync
- `components/editor/editor-toolbar.tsx` — formatting toolbar (heading select, bold/italic/strike, lists, blockquote, sidebar toggle, word count, sync)
- `components/editor/editor-shell.tsx` — manages sidebar open/close state, mobile overlay
- `app/globals.css` — `.tiptap` base styles, placeholder, `dark:prose-invert` token overrides

**Typography extension** handles smart quotes and em-dashes automatically — the markdown output will use curly quotes/proper dashes, which is correct for novel writing.

---

## Choosing & Implementing

Theme C is implemented. Do not switch layout patterns without updating all three layers: the grid in `library/page.tsx`, the card in `novel-card.tsx`, and the skeleton in `LibrarySkeleton`.

**Do not:** mix layout patterns from different themes (e.g., bento grid + list rows). Pick one layout approach and be consistent.

---

## Implemented Feature Log

This section records non-obvious decisions made during implementation so future sessions don't re-derive them.

### Genre system (`types/novel.ts`)
- `GENRES` is a `const` array — the single source of truth for all genre pills across the app
- `NovelSchema.genres` uses `z.array(z.string()).default([])` — NOT `z.enum(GENRES)` — so existing data without genres parses without error
- Genres are stored in **both** `config/novels.json` (for library listing without extra fetches) and `content/{id}/meta.json`
- The `updateNovel` action in `library/actions.ts` keeps both files in sync

### Novel metadata editing (`components/novels/novel-meta-editor.tsx`)
- Client component, toggled by "Edit metadata" button on `/library/[novelId]`
- Edits title, status (pill select), and genres (pill multi-select) in one form
- Calls `updateNovel(novelId, { title, status, genres })` — updates both `novels.json` and `meta.json`
- `revalidatePath` covers both `/library` and `/library/[novelId]`

### Chapter titles (`meta.json` schema)
- `meta.chapterTitles: Record<string, string>` — maps slug → display title
- Slug never changes after creation (changing it would require renaming the `.md` file and rewriting chapterOrder)
- `createChapter` now persists the title: `meta.chapterTitles = { ...meta.chapterTitles, [slug]: title }`
- `renameChapterTitle(novelId, slug, title)` updates the stored title without touching the slug
- Double-click a chapter row in the sidebar to rename inline

### Editor shell and sidebar (`components/editor/editor-shell.tsx`)
- `EditorShell` (client component) owns `sidebarOpen` state and renders both `ChapterSidebar` and `EditorClient`
- On mobile: sidebar is `fixed` with a backdrop overlay; clicking backdrop calls `onClose`
- On desktop: sidebar is `md:relative` in-flow; toggle via toolbar button
- `ChapterSidebar` receives `open: boolean` + `onClose: () => void` props

### Authentication (`app/login/`, `lib/auth.ts`, `proxy.ts`)
- Passphrase gate: users enter the value of `AUTH_SECRET`; on success the app sets an **opaque** `auth_token` cookie (HMAC-based session), not the raw secret
- **`proxy.ts`** protects `/library`, `/edit`, `/admin`, `/api/export/*` (Next.js 16 convention; same role as classic `middleware`)
- **`requireAuth()`** in server actions and cookie checks on export for defense in depth
- `/login` redirects to `/?from=…#private-library`; cookie is httpOnly, 30-day expiry, SameSite=lax
