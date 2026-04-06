---

# UI/UX Design Specification: NovelGit

**Stack:** Next.js 16 (App Router) · Tailwind v4 · React 19 · shadcn/ui (New York style)
**Companion docs:** `/docs/design-docs.md` (architecture) · `/docs/spec/implementation-plan.md` (phases)

**Repo status:** UI primitives are already present under `components/ui/**` and feature areas under `components/editor/**`, `components/novels/**`, etc. The `npx shadcn@latest init` / `add` steps below are the **original bootstrap instructions** for new clones or when adding components—not a prerequisite on every pull.

**Editor (current):** The live app uses **TipTap** (`@tiptap/react`, `tiptap-markdown`) for the writing surface—not CodeMirror. Later sections of this file still mention CodeMirror / WikiLink extensions as **historical or planned** ideas; treat the implemented `components/editor/**` stack as source of truth.

---

## 1. Library Choices

### Primary: shadcn/ui

shadcn/ui generates source files directly into the repo — no versioned dependency — making it inherently compatible with Tailwind v4.

**Init (run once when bootstrapping a fresh project or new workstation):**
```bash
npx shadcn@latest init
# Prompts: TypeScript · New York style · CSS variables · app/globals.css · components/ui alias
```

Use **New York** style (not Default). New York uses `rounded-md` and tighter padding — better suited to an editorial tool than the Default's `rounded-lg` with looser spacing. This choice is permanent; switching after init requires regenerating all components.

**Components to add:**
```bash
npx shadcn@latest add button card dialog badge separator scroll-area tooltip sheet skeleton tabs
```

| Component | Used for |
|---|---|
| `button` | New Novel, Sync to GitHub, Export, toolbar actions |
| `card` | Novel cards on `/library` |
| `dialog` | New Novel modal, Draft Restore confirmation |
| `badge` | Status labels (planning / writing / editing / complete) |
| `separator` | Sidebar section dividers |
| `scroll-area` | Chapter sidebar (custom scrollbar) |
| `tooltip` | Icon-only button labels |
| `sheet` | Mobile chapter sidebar drawer |
| `skeleton` | Loading states for library grid and chapter list |
| `tabs` | Editor / Reader toggle (tablet/mobile) |

### Supplementary Packages

| Package | Purpose | Install |
|---|---|---|
| `lucide-react` | All icons — one coherent set | `npm install lucide-react` |
| `next-themes` | System dark/light mode, no flash on load | `npm install next-themes` |
| `@dnd-kit/core` `@dnd-kit/sortable` `@dnd-kit/utilities` | Chapter drag-and-drop reorder | `npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities` |
| `@tiptap/react` `@tiptap/starter-kit` `tiptap-markdown` (+ typography, placeholder, character-count) | Markdown-capable WYSIWYG editor | See `package.json` |
| `react-markdown` `remark-gfm` `rehype-raw` | Reader Mode HTML rendering | `npm install react-markdown remark-gfm rehype-raw` |
| `use-debounce` | localStorage autosave debounce | `npm install use-debounce` |
| `cmdk` | Command palette (Cmd+K) | `npm install cmdk` |
| `vaul` | Mobile bottom drawer for chapter list | `npm install vaul` |
| `zod` | Schema validation for novels.json, meta.json | `npm install zod` |
| `@tailwindcss/typography` | Prose styles for Reader Mode | `npm install @tailwindcss/typography` |
| `@nivo/calendar` | Writing heatmap (Phase 4) | `npm install @nivo/calendar` |

**Excluded / legacy notes:**
- `framer-motion` — the **landing hero** may still use it; most in-app motion uses CSS. Prefer CSS transitions for new UI.
- `react-calendar-heatmap` — last updated 2021, no TypeScript types; use `@nivo/calendar` instead
- **CodeMirror** — not used in the current editor; TipTap + `tiptap-markdown` replaced the earlier CodeMirror experiment.

**TipTap / prose:** Style the editor surface with Tailwind `prose` + design tokens (`EditorContent` in `editor-client.tsx`). Match Reader pane typography for a coherent read/write experience.

**`@tailwindcss/typography` in Tailwind v4:** Add via `@plugin "@tailwindcss/typography"` in `globals.css` (Tailwind v4 plugin syntax, not a `tailwind.config.ts` entry).

---

## 2. Design Tokens

All tokens live in `app/globals.css`. Extend the existing `@theme inline` block. The `.dark` class on `<html>` (applied by `next-themes`) overrides semantic tokens for dark mode.

### Color Palette

**Primitive swatches — not used directly in components:**

```css
/* Parchment warm neutrals */
--parchment-50:  #faf8f5;
--parchment-100: #f4f0e8;
--parchment-200: #e8dfd0;
--parchment-300: #d5c9b5;
--parchment-400: #b8a896;
--parchment-500: #9a8878;
--parchment-600: #7d6d5e;
--parchment-700: #62554a;
--parchment-800: #4a3f37;
--parchment-900: #332c26;
--parchment-950: #1c1711;

/* Ink blue — interactive accent */
--ink-50:  #f0f4ff;
--ink-100: #e0e9ff;
--ink-200: #c2d3ff;
--ink-300: #93b0ff;
--ink-400: #5d86fa;
--ink-500: #3b64f5;
--ink-600: #2748e0;
--ink-700: #1f38c8;
--ink-800: #1f31a3;
--ink-900: #1e2e82;
--ink-950: #141c50;
```

**Semantic tokens (in `:root`, overridden in `.dark`):**

```css
:root {
  /* Surfaces */
  --bg-base:    var(--parchment-50);
  --bg-elevated: #ffffff;
  --bg-subtle:  var(--parchment-100);
  --bg-muted:   var(--parchment-200);
  --bg-editor:  #ffffff;
  --bg-sidebar: var(--parchment-100);

  /* Text */
  --text-primary:   var(--parchment-950);
  --text-secondary: var(--parchment-700);
  --text-muted:     var(--parchment-500);

  /* Borders */
  --border-default: var(--parchment-200);
  --border-strong:  var(--parchment-300);
  --border-focus:   var(--ink-500);

  /* Interactive */
  --accent:        var(--ink-600);
  --accent-hover:  var(--ink-700);
  --accent-subtle: var(--ink-50);

  /* Sync status */
  --sync-idle:     var(--parchment-400);
  --sync-progress: #4a9e6b;
  --sync-success:  #9b7ecb;
  --sync-error:    #d9534f;

  /* Status badges — use darker shades for text/border to meet WCAG AA */
  --status-planning: #a37c1a;
  --status-writing:  #2d7a4f;
  --status-editing:  #3a5eaa;
  --status-complete: #6e4fa3;

  /* Shadows */
  --shadow-xs: 0 1px 2px 0 rgb(0 0 0 / 0.04);
  --shadow-sm: 0 1px 3px 0 rgb(0 0 0 / 0.07), 0 1px 2px -1px rgb(0 0 0 / 0.05);
  --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.07), 0 2px 4px -2px rgb(0 0 0 / 0.05);
  --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.07), 0 4px 6px -4px rgb(0 0 0 / 0.04);
  --shadow-focus: 0 0 0 3px var(--ink-200);
}

.dark {
  --bg-base:    var(--parchment-950);
  --bg-elevated: var(--parchment-900);
  --bg-subtle:  #1f1a15;
  --bg-muted:   var(--parchment-800);
  --bg-editor:  #100e0c;
  --bg-sidebar: var(--parchment-900);

  --text-primary:   var(--parchment-100);
  --text-secondary: var(--parchment-300);
  --text-muted:     var(--parchment-500);

  --border-default: var(--parchment-800);
  --border-strong:  var(--parchment-700);

  --accent:        var(--ink-400);
  --accent-hover:  var(--ink-300);
  --accent-subtle: var(--ink-950);

  --shadow-xs: 0 1px 2px 0 rgb(0 0 0 / 0.3);
  --shadow-sm: 0 1px 3px 0 rgb(0 0 0 / 0.4), 0 1px 2px -1px rgb(0 0 0 / 0.3);
  --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.4), 0 2px 4px -2px rgb(0 0 0 / 0.3);
  --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.5), 0 4px 6px -4px rgb(0 0 0 / 0.4);
}
```

**Expose as Tailwind utilities via `@theme inline`:**

```css
@theme inline {
  /* Fonts (extend existing block) */
  --font-sans:  var(--font-geist-sans);
  --font-mono:  var(--font-geist-mono);
  --font-serif: var(--font-lora), Georgia, Cambria, "Times New Roman", serif;

  /* Background color utilities */
  --color-base:     var(--bg-base);
  --color-elevated: var(--bg-elevated);
  --color-subtle:   var(--bg-subtle);
  --color-editor:   var(--bg-editor);
  --color-sidebar:  var(--bg-sidebar);

  /* Text color utilities */
  --color-primary:   var(--text-primary);
  --color-secondary: var(--text-secondary);
  --color-muted:     var(--text-muted);

  /* Accent utilities */
  --color-accent:        var(--accent);
  --color-accent-hover:  var(--accent-hover);
  --color-accent-subtle: var(--accent-subtle);

  /* Border utilities */
  --color-border:        var(--border-default);
  --color-border-strong: var(--border-strong);
  --color-ring:          var(--border-focus);

  /* Status colors */
  --color-status-planning: var(--status-planning);
  --color-status-writing:  var(--status-writing);
  --color-status-editing:  var(--status-editing);
  --color-status-complete: var(--status-complete);
}
```

### Typography

```css
@theme inline {
  /* Font sizes */
  --text-xs:   0.75rem;    /* 12px */
  --text-sm:   0.875rem;   /* 14px */
  --text-base: 1rem;       /* 16px */
  --text-lg:   1.125rem;   /* 18px */
  --text-xl:   1.25rem;    /* 20px */
  --text-2xl:  1.5rem;     /* 24px */
  --text-3xl:  1.875rem;   /* 30px */
  --text-4xl:  2.25rem;    /* 36px */

  /* Line heights */
  --leading-tight:   1.25;
  --leading-snug:    1.375;
  --leading-normal:  1.5;
  --leading-relaxed: 1.625;
  --leading-prose:   1.8;   /* Editor-specific: optimized for long-form reading */

  /* Letter spacing */
  --tracking-tight:   -0.025em;
  --tracking-normal:   0em;
  --tracking-widest:   0.1em;   /* Status badge labels */
}
```

### Layout Constants

```css
@theme inline {
  --editor-max-width:          45rem;    /* 720px — editor prose column */
  --editor-padding-x:          2.5rem;   /* 40px side padding inside editor */
  --sidebar-width:             16rem;    /* 256px — chapter sidebar */
  --sidebar-collapsed-width:   3rem;     /* 48px — icon-only rail */
  --nav-height:                3.5rem;   /* 56px — top bar */
}
```

---

## 3. Component Inventory

### 3.1 Shared / Global

| Component | File | shadcn base | Notes |
|---|---|---|---|
| `RootLayout` | `app/layout.tsx` | — | Loads Lora + Geist Sans + Geist Mono via `next/font/google`. Wraps with `ThemeProvider`. Applies all font CSS variables to `<html>`. |
| `ThemeProvider` | `components/theme-provider.tsx` | — | Thin wrapper: `next-themes` `ThemeProvider` with `attribute="class"` `defaultTheme="system"` `enableSystem`. |
| `TopNav` | `components/top-nav.tsx` | — | 56px fixed bar. Left: logo/wordmark. Center: breadcrumb. Right: `DarkModeToggle` + command palette trigger. Not rendered on `/edit/*` (route group strategy). |
| `DarkModeToggle` | `components/dark-mode-toggle.tsx` | `button` (ghost, icon) | `useTheme()` from next-themes. `Sun` / `Moon` icons from lucide-react. 36×36px hit target. |
| `CommandPalette` | `components/command-palette.tsx` | `cmdk` | Triggered by `Cmd+K`. Groups: Navigate · Chapters (current novel) · Actions. Max-width 560px centered overlay. `role="combobox"` input, `role="listbox"` results. |
| `LoadingSpinner` | `components/loading-spinner.tsx` | — | SVG spinner. Variants: `sm` (16px) `md` (24px) `lg` (40px). |

### 3.2 Library Page (`/library`)

| Component | File | shadcn base | Notes |
|---|---|---|---|
| `LibraryPage` | `app/(main)/library/page.tsx` | — | Server component. Fetches `novels.json`. Passes array to `NovelGrid` via Suspense. |
| `NovelGrid` | `app/(main)/library/novel-grid.tsx` | — | CSS grid: 1 col mobile · 2 col md · 3 col lg. Gap 24px. |
| `NovelCard` | `app/(main)/library/novel-card.tsx` | `card` | Title (serif, text-2xl), genre + last-synced (text-sm, muted), `StatusBadge`, word count + chapter count, three-dot `MoreHorizontal` dropdown (Edit metadata · View analytics · Delete). Hover: shadow-md transition 120ms. Click: navigate to first chapter. |
| `StatusBadge` | `components/status-badge.tsx` | `badge` | Color via `border-l-4` + text using `--status-*` tokens (border+text pattern, not filled background). Text: uppercase, tracking-widest, text-xs. |
| `NewNovelButton` | `app/(main)/library/new-novel-button.tsx` | `button` | Desktop: inline in page header. Mobile: FAB fixed bottom-right (56px circle, z-50). Icon: `Plus`. |
| `NewNovelDialog` | `app/(main)/library/new-novel-dialog.tsx` | `dialog` | Wraps `NewNovelForm`. Focus trapped. Closes on success or Escape. `aria-modal="true"`. |
| `NewNovelForm` | `app/(main)/library/new-novel-form.tsx` | — | Fields: Title (required), Genre (optional), Status (select, defaults to "planning"). Zod client validation before submit. Inline error messages. Calls `createNovel` Server Action. Shows spinner on submit; fields disabled during request. |
| `LibrarySkeleton` | `app/(main)/library/library-skeleton.tsx` | `skeleton` | N skeleton cards matching `NovelCard` dimensions. Used as Suspense fallback. |
| `EmptyLibraryState` | `app/(main)/library/empty-state.tsx` | — | Centered SVG illustration + "Your library is empty" headline + `NewNovelButton`. Shown when `novels.json` array is empty. |

### 3.3 Editor Page (`/edit/[novelId]/[chapterSlug]`)

| Component | File | shadcn base | Notes |
|---|---|---|---|
| `EditorPage` | `app/(editor)/edit/[novelId]/[chapterSlug]/page.tsx` | — | Server component. Fetches chapter content + chapter list from GitHub. Passes to `EditorShell`. |
| `EditorShell` | `app/(editor)/edit/[novelId]/[chapterSlug]/editor-shell.tsx` | — | Client component. Owns all UI state: editor vs reader mode, sidebar collapsed, sync status, draft restore. Full-viewport layout container. |
| `EditorTopBar` | `app/(editor)/edit/[novelId]/editor-top-bar.tsx` | — | 56px bar. Left: `← Library` link (`ChevronLeft`). Center: breadcrumb `[Novel] / [Chapter]`. Right: `WordCountDisplay` · Reader toggle · `SyncButton` · `MoreHorizontal` menu. |
| `ChapterSidebar` | `app/(editor)/edit/[novelId]/chapter-sidebar.tsx` | `scroll-area` `tooltip` `separator` | Left panel, 256px. Collapsible to 48px icon rail via CSS `width` transition 200ms. dnd-kit sortable list. Collapse toggle: `ChevronLeft` / `ChevronRight` icon at top. |
| `ChapterItem` | `app/(editor)/edit/[novelId]/chapter-item.tsx` | — | Drag handle (`GripVertical`, hidden until hover), chapter number + title, word count chip. Active chapter: `bg-accent-subtle` left border. `isDragging`: `shadow-lg scale-[1.02]`. |
| `NewChapterButton` | `app/(editor)/edit/[novelId]/new-chapter-button.tsx` | `button` (ghost, sm) | At bottom of sidebar. Icon: `FilePlus`. Opens inline name input or simple dialog. Enforces `NN-slug.md` naming convention. |
| `EditorPane` | `app/(editor)/edit/[novelId]/[chapterSlug]/editor-pane.tsx` | — | Centering container: `max-w-[--editor-max-width]` auto margins, padding top/bottom 80px, padding x `--editor-padding-x`. |
| `EditorClient` | `app/(editor)/edit/[novelId]/[chapterSlug]/editor-client.tsx` | — | `@uiw/react-codemirror`. Custom parchment theme (see §2). Font: Lora 19px, `line-height: 1.8`. No line numbers. No gutter. `[[...]]` extension highlights WikiLinks in `--accent-subtle` background. |
| `EditorToolbar` | `app/(editor)/edit/[novelId]/[chapterSlug]/editor-toolbar.tsx` | `button` `separator` `tooltip` | Floats above editor. Left: Bold · Italic · `[[WikiLink]]` insert. Right: `WordCountDisplay` · Reader Mode toggle · `SyncButton`. Opacity 40% at rest, 100% on editor focus or toolbar hover. Transition 150ms. `role="toolbar"`. |
| `ReaderPane` | `app/(editor)/edit/[novelId]/reader-pane.tsx` | — | `react-markdown` + `remark-gfm`. `@tailwindcss/typography` `prose` class, customized to use Lora + parchment tokens. Same `max-w-[--editor-max-width]` column. Renders `[[Name]]` as `WikiLink` component (see §3.4). |
| `SyncStatusBanner` | `components/sync-status-banner.tsx` | — | Fixed bottom, full width, 40px. States: idle (hidden), syncing (spinner + "Saving to GitHub…"), success (count-up from 0s + "~45s rebuild"), error (`AlertCircle` + "Sync failed" + Retry). `role="status"` `aria-live="polite"`. Slide-up 8px 200ms on appear. |
| `SyncButton` | `components/sync-button.tsx` | `button` | In `EditorToolbar` and `EditorTopBar`. Icon-only on mobile (tooltip: "Sync to GitHub"). Disabled while syncing. Shortcut: `Cmd+S`. |
| `DraftRestoreDialog` | `components/draft-restore-dialog.tsx` | `dialog` | `role="alertdialog"`. Shown on editor mount when localStorage draft timestamp > GitHub fetch timestamp. Copy: *"A newer version exists on GitHub (possibly from Obsidian). Restore your local draft or use the GitHub version?"* Buttons: "Restore draft" (primary) · "Use GitHub version" (ghost). |
| `WordCountDisplay` | `components/word-count-display.tsx` | — | Live count derived from editor content. Format: "1,234 words". Updates on editor `onChange`. |
| `LoreSidebar` | `app/(editor)/edit/[novelId]/lore-sidebar.tsx` | `scroll-area` `separator` | Right panel, 280px, appears when toggled in Reader Mode. Lists lore entries scoped to current novel's `/lore/` folder. Each entry: title + excerpt. Clicking navigates to lore detail. |

### 3.4 Obsidian WikiLink Components

| Component | File | Notes |
|---|---|---|
| `WikiLink` | `components/wiki-link.tsx` | Used inside `ReaderPane` as a custom `react-markdown` component for `[[Name]]` patterns. Resolved link: styled as internal anchor, opens `LoreSidebar` to that entry. Unresolved link: dashed underline + `Plus` icon affordance; clicking creates the lore entry. |
| WikiLink CodeMirror extension | `lib/codemirror-wikilink.ts` | Marks `[[...]]` spans with a CSS class (`cm-wikilink`). Styled with `background: var(--accent-subtle)` and `border-radius: 2px`. Click handler opens lore entry in sidebar. Preserves raw `[[Name]]` syntax — never rewrites it. |

### 3.5 Analytics Page (`/library/[novelId]/analytics`) — Phase 4

| Component | File | shadcn base | Notes |
|---|---|---|---|
| `AnalyticsPage` | `app/(main)/library/[novelId]/analytics/page.tsx` | — | Server component. Fetches `analytics.json`. |
| `HeatmapCalendar` | `components/heatmap-calendar.tsx` | — | `@nivo/calendar`. Full-year view. Color scale: `--parchment-200` (0 words) → `--ink-600` (max). Tooltip: "N words on [date]". Horizontal scroll on mobile. |
| `StatsGrid` | `components/stats-grid.tsx` | `card` | 4 stat cards: Total words · Chapters · Avg. words/session · Longest streak. 2-col mobile, 4-col desktop. |
| `ChapterWordTable` | `components/chapter-word-table.tsx` | — | Per-chapter word counts. Sortable columns. |

---

## 4. Page Layouts

### Route Group Strategy

```
app/
├── (main)/                          ← layout.tsx includes TopNav
│   ├── library/
│   │   ├── page.tsx
│   │   └── [novelId]/
│   │       └── analytics/page.tsx
│   └── layout.tsx                   ← renders <TopNav> + {children}
└── (editor)/                        ← layout.tsx is full-viewport, no TopNav
    └── edit/
        └── [novelId]/
            └── [chapterSlug]/
                └── page.tsx
```

### Library (`/library`)

**Desktop (≥1024px):**
```
┌──────────────────────────────────────────────────────────┐
│ TopNav (56px fixed)                                      │
├──────────────────────────────────────────────────────────┤
│  pt-20 (nav clearance)                                   │
│  max-w-[1200px] mx-auto px-8                             │
│                                                          │
│  h1 "Your Library"        [+ New Novel]                  │
│  ─────────────────────────────────────                   │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐                 │
│  │ NovelCard│ │ NovelCard│ │ NovelCard│                  │
│  └──────────┘ └──────────┘ └──────────┘                 │
│  ...                                                     │
└──────────────────────────────────────────────────────────┘
```

- Tablet (768–1023px): 2-col grid
- Mobile (<768px): 1-col grid; New Novel button becomes FAB

**NovelCard anatomy:**
```
┌─────────────────────────────────┐
│ [Status badge]                  │
│                                 │
│ Novel Title          (serif 2xl)│
│ Genre · Last synced  (sm, muted)│
│                                 │
│ ─────────────────────────────── │
│ N,NNN words    N chapters       │
└─────────────────────────────────┘
```

### Editor (`/edit/[novelId]/[chapterSlug]`)

**Desktop (≥1024px), default state:**
```
┌──────────────────────────────────────────────────────────────┐
│ ← Library  Novel / Chapter           [wc] [Read] [Sync] [⋮] │  56px
├──────────────┬───────────────────────────────────────────────┤
│              │                                               │
│ ChapterList  │      Markdown Editor                         │
│ 256px        │      max-width 720px, centered               │
│ (collapsible │      Lora 19px / line-height 1.8             │
│  to 48px     │                                               │
│  icon rail)  │                                               │
│              │                                               │
├──────────────┴───────────────────────────────────────────────┤
│ SyncStatusBanner (40px fixed bottom, full width)             │
└──────────────────────────────────────────────────────────────┘
```

**With sidebar collapsed:**
```
┌────┬─────────────────────────────────────────────────────────┐
│ 48 │              Editor (same 720px max-width)              │
│ px │                                                         │
└────┴─────────────────────────────────────────────────────────┘
```

**Reader Mode (any width):**
- CodeMirror pane replaced by `ReaderPane` (150ms opacity crossfade)
- `LoreSidebar` toggle appears in top bar
- Toolbar switches to show "Edit" button

**Breakpoint summary:**

| Breakpoint | Sidebar | Editor width | Reader |
|---|---|---|---|
| `<768px` | `vaul` bottom drawer | 100% | Tab toggle |
| `768–1023px` | Collapsible panel, default closed | 100% when closed | Tab toggle |
| `≥1024px` | Collapsible panel, default open | flex-1 capped 720px | Replaces editor inline |

---

## 5. UX Flows

### Create Novel
```
/library → click "New Novel"
  → NewNovelDialog opens, focus on Title input
  → User fills Title (required), Genre, Status
  → Submit: fields disabled, spinner on button
  → createNovel Server Action:
      Success → dialog closes → optimistic card appears (skeleton shimmer)
               → revalidation replaces skeleton with real card
               → grid scrolls to new card, card pulses once
      Error (slug collision) → dialog stays open
               → "A novel with a similar title already exists"
      Error (GitHub) → "Failed to create — check GitHub connection"
```

### Open Chapter
```
/library → click NovelCard
  → navigate to /edit/[novelId]/[firstChapterSlug]
  → server fetches chapter content (GitHub SHA + content)
  → EditorShell mounts
      → check localStorage key `draft:[novelId]:[chapterSlug]`
      → if draft timestamp > GitHub fetch timestamp:
          DraftRestoreDialog appears
          "Restore draft" → load localStorage content into editor
          "Use GitHub version" → load GitHub content, clear localStorage draft
      → else: load GitHub content directly
  → editor focused, autosave begins (debounce 1500ms → localStorage)
```

### Sync to GitHub
```
Editor → Cmd+S or "Sync" button
  → SyncButton disabled
  → SyncStatusBanner: spinner + "Saving to GitHub…"
  → syncChapter Server Action: getFile (SHA) → putFile
      Success:
        → localStorage draft cleared
        → SyncStatusBanner: "Saved at HH:MM — page rebuilding"
        → count-up timer from 0s starts; at ~45s: "Refresh to see changes" + Refresh button
        → SyncButton re-enabled
      Error:
        → SyncStatusBanner: "Sync failed — check connection" + [Retry]
        → localStorage draft preserved
        → SyncButton re-enabled
```

### Drag-Reorder Chapters
```
ChapterSidebar → hover chapter item → GripVertical handle appears
  → mousedown/touchstart on handle:
      item lifts: scale(1.02), shadow-lg
  → drag: other items shift (dnd-kit sortable animation)
  → drop: settle animation, visual order updated optimistically
  → reorderChapters Server Action fires (updates meta.json chapterOrder)
      Error → order reverts, toast: "Couldn't save order — try again"

Keyboard: Space to pick up · Arrow keys to move · Space/Enter to drop · Escape to cancel
Announcement: "Chapter N moved to position M" (dnd-kit announcements API)
```

### Toggle Reader Mode
```
Editor → Cmd+Shift+R or toolbar "Reader" button
  → CodeMirror fades out (opacity 0, 150ms)
  → ReaderPane fades in (opacity 1, 150ms)
      renders react-markdown of current editor content
  → Toolbar: "Reader" button replaced with "Edit" button
  → LoreSidebar toggle appears in top bar
  → URL unchanged; state is local to EditorShell
  → cursor position in CodeMirror preserved (state not reset)
```

### Obsidian Conflict (Draft Restore)
```
User edits in Obsidian → Obsidian Git plugin pushes to GitHub
  → user opens same chapter in web editor
  → EditorPage fetches latest GitHub content (newer than localStorage draft)
  → DraftRestoreDialog appears:
      "A newer version exists on GitHub (possibly from Obsidian).
       Restore your local draft or use the GitHub version?"
      [Restore draft]        [Use GitHub version]
```

### Command Palette
```
Anywhere → Cmd+K
  → CommandPalette overlay (backdrop blur-sm, z-50)
  → focus moves to search input
  → default groups:
      Navigate    → Library · [Current Novel] Analytics
      Chapters    → (if on editor) list chapters for current novel
      Actions     → New Novel · Export PDF · Export Docx · Toggle theme
  → type to fuzzy-filter
  → Arrow keys navigate · Enter selects · Escape closes
  → on close: focus returns to previous element
```

---

## 6. Accessibility

### Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Cmd+K` | Open command palette |
| `Cmd+S` | Sync to GitHub |
| `Cmd+Shift+R` | Toggle Reader Mode |
| `Cmd+Shift+[` | Previous chapter |
| `Cmd+Shift+]` | Next chapter |
| `Escape` | Close modal / palette / discard dialog |

### ARIA Roles and Labels

| Element | ARIA |
|---|---|
| `TopNav` | `role="navigation"` `aria-label="Main navigation"` |
| `ChapterSidebar` | `role="navigation"` `aria-label="Chapter list"` |
| `NewNovelDialog` | `role="dialog"` `aria-modal="true"` `aria-labelledby="dialog-title"` |
| `DraftRestoreDialog` | `role="alertdialog"` `aria-modal="true"` |
| `SyncStatusBanner` | `role="status"` `aria-live="polite"` |
| `LoadingSpinner` | `role="status"` `aria-label="Loading"` |
| `EditorToolbar` | `role="toolbar"` `aria-label="Editor formatting"` |
| Drag handle | `aria-label="Drag to reorder [chapter title]"` `tabIndex={0}` |
| `CommandPalette` input | `role="combobox"` (cmdk handles this) |
| Library grid container | `aria-label="Showing N novels"` |
| Skeleton container | `aria-busy="true"` |

### Focus Management

- **Dialog open:** Focus moves to first focusable element (Title input in `NewNovelDialog`; primary action button in `DraftRestoreDialog`)
- **Dialog close:** Focus returns to the trigger element
- **Route change:** Focus moves to `<h1>` of new page
- **Skip link:** `<a href="#main-content">Skip to main content</a>` — first element in body, visually hidden until focused

### Reduced Motion

All CSS transitions respect `prefers-reduced-motion: reduce`. Use Tailwind `motion-safe:` prefix or:

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

### Color Contrast

Status badge colors use the darker swatch variants defined in §2 for text and left-border, with a light tinted background (`bg-[color]/10`). All combinations meet WCAG 2.1 AA (4.5:1 for body text, 3:1 for UI components).

---

## 7. Animation Budget

Zen principle: **motion only signals state change.** No decorative animation.

| Element | Motion | Duration | Easing |
|---|---|---|---|
| Dialog open/close | Fade + scale(0.96→1) | 150ms | ease-out |
| Sidebar collapse/expand | `width` transition | 200ms | ease-in-out |
| Editor/Reader crossfade | opacity | 150ms | ease |
| SyncStatusBanner appear | slide up 8px | 200ms | ease-out |
| Novel card hover | `box-shadow` elevation | 120ms | ease |
| Drag item lift | `scale(1→1.02)` + shadow | 100ms | ease |
| Drag item settle | spring | 250ms | dnd-kit spring |
| Command palette | Fade + scale(0.98→1) | 100ms | ease-out |
| Skeleton shimmer | gradient sweep | 1.5s | linear ∞ |

All other state changes: **instant.**

---

## 8. Obsidian Integration

The content GitHub repository doubles as an **Obsidian vault** for offline editing.

### WikiLink Syntax

- All lore/character references are written as `[[Character Name]]` — Obsidian's native format
- The web editor **preserves this syntax exactly** on every read/write round-trip; no rewriting
- **In CodeMirror:** `lib/codemirror-wikilink.ts` extension highlights `[[...]]` spans with `bg-accent-subtle` and `border-radius: 2px` — visually distinct from plain text but not styled as a URL
- **In Reader Mode:** `react-markdown` uses a custom `WikiLink` component for `[[...]]` patterns:
  - Resolved link (lore file exists): styled internal anchor; click opens `LoreSidebar` to that entry
  - Unresolved link (no lore file): dashed underline + `Plus` icon; click triggers lore entry creation
- **Lore scoping:** Only lore files from `content/[current-novel-id]/lore/` are resolvable as WikiLinks

### File Structure Compatibility

- Each `content/[novel-id]/` folder is a valid Obsidian vault root
- Chapter filenames (`01-intro.md`, `02-chapter.md`) use numeric prefixes intentionally — Obsidian sorts alphabetically, so prefixes control order in Obsidian's file explorer as well as the web sidebar
- The web editor must **never add frontmatter** unless it is valid YAML that Obsidian will not corrupt; if frontmatter is needed for metadata, use Obsidian-compatible YAML only
- Do not rename or restructure files via the web UI in ways that would break Obsidian's internal `[[links]]`

### Conflict Handling

- Obsidian pushes changes to GitHub via the community Obsidian Git plugin
- The web editor calls `getFile` (fetching the latest SHA) before every `putFile` — Obsidian-originated commits are automatically incorporated
- If the user has a **localStorage draft AND** Obsidian has since pushed a newer commit, the `DraftRestoreDialog` will show with Obsidian-aware copy (see §5 — Obsidian Conflict flow)
- **Known limitation:** No simultaneous edit protection. Last-write-wins. Document this in the operational notes on the editor page (tooltip or help link)

### UI Notes

- No Obsidian branding in the web UI — the integration is transparent to users unfamiliar with Obsidian
- The `LoreSidebar` + WikiLink behavior intentionally mirrors Obsidian's linked-mentions panel; Obsidian users will find it familiar

---

## 9. Implementation Sequencing

Maps to phases in `docs/spec/implementation-plan.md`.

**Phase 1 — Infrastructure (UI tasks):**
1. Extend `app/globals.css` with primitive + semantic tokens + `@theme inline` entries
2. Add Lora font to `app/layout.tsx`; expose as `--font-lora` CSS variable
3. Wrap layout with `ThemeProvider`
4. Create `components/theme-provider.tsx`, `components/top-nav.tsx`, `components/dark-mode-toggle.tsx`

**Phase 2 — Library (UI tasks):**
1. `npx shadcn@latest init` (New York, CSS variables)
2. `npx shadcn@latest add button card dialog badge separator skeleton`
3. Install `lucide-react`, `next-themes`, `zod`
4. Create route group `app/(main)/` with TopNav layout
5. Build all Library page components (§3.2)

**Phase 3 — Editor (UI tasks):**
1. `npx shadcn@latest add scroll-area tooltip sheet tabs`
2. Install `@dnd-kit/*`, `@uiw/react-codemirror`, `@codemirror/lang-markdown`, `react-markdown`, `remark-gfm`, `rehype-raw`, `use-debounce`, `cmdk`, `vaul`, `@tailwindcss/typography`
3. Create route group `app/(editor)/` with full-viewport layout
4. Build editor layout shell and `EditorTopBar`
5. Build `ChapterSidebar` with static list, then add dnd-kit
6. Build `EditorClient` with custom CodeMirror theme + WikiLink extension
7. Wire localStorage autosave (debounce 1500ms)
8. Build `SyncStatusBanner`, `SyncButton`, `DraftRestoreDialog`
9. Build `ReaderPane` with WikiLink component and `LoreSidebar`
10. Build `CommandPalette` (non-critical path, add last)

**Phase 4 — Polish (UI tasks):**
1. Install `@nivo/calendar`
2. Build `HeatmapCalendar`, `StatsGrid`, `ChapterWordTable`
3. Add export buttons to `EditorTopBar` → `MoreHorizontal` dropdown
