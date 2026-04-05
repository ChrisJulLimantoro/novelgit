# NovelGit — Step-by-Step Build Plan

**Purpose:** Concrete, ordered execution steps. Follow sequentially — do not skip phases.
**Reference docs:** `docs/design-docs.md` (architecture), `docs/ui-ux.md` (UI/UX), `docs/spec/implementation-plan.md` (acceptance criteria)
**Current state:** Bare Next.js 16.2.2 scaffold. Only `app/layout.tsx`, `app/page.tsx`, `app/globals.css` exist.

---

## Phase 1 — Infrastructure

**Goal:** GitHub connection working, design tokens applied, auth middleware in place, serif font loaded.

### Step 1.1 — Prerequisites (do once, outside the codebase)

1. Create a private GitHub repository (e.g. `your-username/novelgit-content`).
2. Generate a GitHub PAT (classic) with `contents: read/write` and `metadata: read` scopes.
3. Seed the content repo with two files:
   - `config/novels.json` → `{ "novels": [] }`
   - `content/.gitkeep` → empty file
4. Create `.env.local` in the project root (git-ignored):
   ```
   GITHUB_TOKEN=ghp_xxxxxxxxxxxx
   GITHUB_REPO=your-username/novelgit-content
   AUTH_SECRET=some-random-string-min-32-chars
   ```

### Step 1.2 — Install dependencies

```bash
npm install octokit zod next-themes
npm install lucide-react
```

### Step 1.3 — Create `lib/config.ts`

```ts
export const [REPO_OWNER, REPO_NAME] = (process.env.GITHUB_REPO ?? "").split("/");
```

### Step 1.4 — Create `lib/github.ts`

```ts
import { Octokit } from "octokit";
export const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
```

### Step 1.5 — Create `middleware.ts`

Protect `/edit` and `/admin` routes using the `AUTH_SECRET` cookie.

```ts
import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const token = request.cookies.get("auth_token")?.value;
  if (token !== process.env.AUTH_SECRET) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/edit/:path*", "/admin/:path*"],
};
```

> Note: A `/login` page is not in scope for Phase 1. For local dev, set the `auth_token` cookie manually in DevTools or create a temporary bypass.

### Step 1.6 — Update `app/globals.css`

Replace the entire file with the full design token set from `docs/ui-ux.md` § Design Tokens. Key structure:

```css
@import "tailwindcss";
@plugin "@tailwindcss/typography";

/* Primitive palette */
:root {
  /* Parchment neutrals */
  --parchment-50: #faf8f4;
  --parchment-100: #f3ede2;
  --parchment-200: #e8dcc9;
  --parchment-300: #d9c8ab;
  --parchment-400: #c4a87e;
  --parchment-500: #b08d60;
  --parchment-600: #9a7449;
  --parchment-700: #7e5c37;
  --parchment-800: #5e4229;
  --parchment-900: #3e2b1a;
  --parchment-950: #1f150c;

  /* Ink blue accent */
  --ink-50:  #eef2fb;
  --ink-100: #d5e0f5;
  --ink-200: #a8bee9;
  --ink-300: #7499d9;
  --ink-400: #4f77c8;
  --ink-500: #3358b0;
  --ink-600: #284490;
  --ink-700: #1e3370;
  --ink-800: #142350;
  --ink-900: #0b1430;
  --ink-950: #060a18;

  /* Semantic tokens — light mode */
  --bg-base:     var(--parchment-50);
  --bg-elevated: #ffffff;
  --bg-editor:   #ffffff;
  --bg-sidebar:  var(--parchment-100);
  --text-primary: var(--parchment-950);
  --text-muted:   var(--parchment-600);
  --accent:       var(--ink-600);
  --accent-hover: var(--ink-700);
  --border-default: var(--parchment-200);
  --shadow-sm: 0 1px 3px rgb(0 0 0 / 0.06);
  --shadow-md: 0 4px 12px rgb(0 0 0 / 0.08);

  /* Status badge colors (text + border, not fill) */
  --status-planning: var(--parchment-700);
  --status-writing:  #2d7a3a;
  --status-editing:  var(--ink-700);
  --status-complete: #5b2d8a;

  /* Layout constants */
  --sidebar-width:           16rem;   /* 256px */
  --sidebar-collapsed-width: 3rem;    /* 48px */
  --nav-height:              3.5rem;  /* 56px */
  --editor-max-width:        45rem;   /* 720px */
}

.dark {
  --bg-base:      var(--parchment-950);
  --bg-elevated:  var(--parchment-900);
  --bg-editor:    var(--parchment-900);
  --bg-sidebar:   var(--parchment-950);
  --text-primary: var(--parchment-50);
  --text-muted:   var(--parchment-400);
  --accent:       var(--ink-300);
  --accent-hover: var(--ink-200);
  --border-default: var(--parchment-800);
  --shadow-sm: 0 1px 3px rgb(0 0 0 / 0.3);
  --shadow-md: 0 4px 12px rgb(0 0 0 / 0.4);
  --status-planning: var(--parchment-300);
  --status-writing:  #5ec46b;
  --status-editing:  var(--ink-300);
  --status-complete: #a865d4;
}

@theme inline {
  --font-sans:  var(--font-geist-sans);
  --font-mono:  var(--font-geist-mono);
  --font-serif: var(--font-lora), Georgia, Cambria, "Times New Roman", serif;

  --leading-prose: 1.8;
  --color-background: var(--bg-base);
  --color-foreground: var(--text-primary);
}

body {
  background: var(--bg-base);
  color: var(--text-primary);
}
```

### Step 1.7 — Update `app/layout.tsx`

Add Lora font, ThemeProvider wrapper, and base metadata.

```tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono, Lora } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const lora = Lora({ variable: "--font-lora", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "NovelGit",
  description: "Your private writing workspace",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${lora.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
```

### Step 1.8 — Create `components/theme-provider.tsx`

```tsx
"use client";
import { ThemeProvider as NextThemesProvider } from "next-themes";

export function ThemeProvider({ children, ...props }: React.ComponentProps<typeof NextThemesProvider>) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
```

### Step 1.9 — Create `components/dark-mode-toggle.tsx`

```tsx
"use client";
import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";

export function DarkModeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  return (
    <button
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      className="p-2 rounded-md hover:bg-[var(--bg-sidebar)] transition-colors"
      aria-label="Toggle dark mode"
    >
      {resolvedTheme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}
```

### Step 1.10 — Create `components/top-nav.tsx`

```tsx
import Link from "next/link";
import { DarkModeToggle } from "./dark-mode-toggle";

interface TopNavProps {
  breadcrumb?: { label: string; href?: string }[];
}

export function TopNav({ breadcrumb }: TopNavProps) {
  return (
    <nav
      role="navigation"
      aria-label="Main navigation"
      className="h-[var(--nav-height)] border-b border-[var(--border-default)] flex items-center px-6 gap-4 bg-[var(--bg-elevated)]"
    >
      <Link href="/library" className="font-serif font-semibold text-lg shrink-0">
        NovelGit
      </Link>
      {breadcrumb && (
        <ol className="flex items-center gap-1 text-sm text-[var(--text-muted)] flex-1 min-w-0">
          {breadcrumb.map((crumb, i) => (
            <li key={i} className="flex items-center gap-1 truncate">
              {i > 0 && <span>/</span>}
              {crumb.href ? (
                <Link href={crumb.href} className="hover:text-[var(--text-primary)] truncate">
                  {crumb.label}
                </Link>
              ) : (
                <span className="truncate">{crumb.label}</span>
              )}
            </li>
          ))}
        </ol>
      )}
      <div className="ml-auto flex items-center gap-2">
        <DarkModeToggle />
      </div>
    </nav>
  );
}
```

### Step 1.11 — Update `app/page.tsx`

```tsx
import { redirect } from "next/navigation";
export default function Home() {
  redirect("/library");
}
```

### Step 1.12 — Verify GitHub connection (temporary)

Create `app/api/health/route.ts`:

```ts
import { octokit } from "@/lib/github";
import { REPO_OWNER, REPO_NAME } from "@/lib/config";

export async function GET() {
  const { data } = await octokit.rest.repos.get({ owner: REPO_OWNER, repo: REPO_NAME });
  return Response.json({ name: data.name, private: data.private });
}
```

Run `npm run dev`, visit `/api/health`. Confirm the repo name is returned. **Delete this file after verification.**

### Step 1.13 — Install `@tailwindcss/typography`

```bash
npm install @tailwindcss/typography
```

Add to `globals.css` (already shown in Step 1.6):
```css
@plugin "@tailwindcss/typography";
```

---

### Phase 1 Acceptance Checklist
- [ ] `npm run dev` starts without errors
- [ ] `/api/health` returns GitHub repo metadata (then file deleted)
- [ ] Lora font loads (check DevTools Network for font files)
- [ ] Dark mode toggle switches theme; system preference respected on first load
- [ ] Visiting `/edit/anything` redirects (verify cookie auth works)
- [ ] `--font-serif` and all CSS variables visible in DevTools

---

## Phase 2 — Library Management

**Goal:** `/library` reads `novels.json` from GitHub, renders project cards, "New Novel" creates folder scaffold.

### Step 2.1 — Initialize shadcn/ui

```bash
npx shadcn@latest init
```

Choose: TypeScript, **New York** style, CSS variables, `app/globals.css`.

Then add components:

```bash
npx shadcn@latest add button card dialog badge separator scroll-area tooltip sheet skeleton tabs input label
```

### Step 2.2 — Create `types/novel.ts`

```ts
import { z } from "zod";

export const NovelSchema = z.object({
  id:     z.string(),
  title:  z.string(),
  path:   z.string(),
  status: z.enum(["planning", "writing", "editing", "complete"]),
});

export const LibrarySchema = z.object({
  novels: z.array(NovelSchema),
});

export type Novel  = z.infer<typeof NovelSchema>;
export type Library = z.infer<typeof LibrarySchema>;
```

### Step 2.3 — Create `lib/github-content.ts`

```ts
import { octokit } from "./github";
import { REPO_OWNER, REPO_NAME } from "./config";

export async function getFile(path: string): Promise<{ content: string; sha: string }> {
  const { data } = await octokit.rest.repos.getContent({
    owner: REPO_OWNER,
    repo:  REPO_NAME,
    path,
  });
  if (Array.isArray(data) || data.type !== "file") {
    throw new Error(`${path} is not a file`);
  }
  return {
    content: Buffer.from(data.content, "base64").toString("utf-8"),
    sha:     data.sha,
  };
}

export async function putFile(
  path:    string,
  content: string,
  sha:     string,
  message: string,
): Promise<void> {
  await octokit.rest.repos.createOrUpdateFileContents({
    owner:   REPO_OWNER,
    repo:    REPO_NAME,
    path,
    message,
    content: Buffer.from(content).toString("base64"),
    sha:     sha || undefined,
  });
}
```

> **Important:** Pass `sha: undefined` (not `""`) for new files — the Octokit API omits the field when undefined, which is required for file creation.

### Step 2.4 — Create route group layouts

Create the route group structure (no layout file needed for `(main)` yet — it will be added in this step):

```
app/
├── (main)/
│   └── library/
│       └── page.tsx
└── (editor)/
    └── edit/
        └── [novelId]/
            └── [chapterSlug]/
                └── page.tsx   ← placeholder, Phase 3
```

Create `app/(main)/layout.tsx`:

```tsx
import { TopNav } from "@/components/top-nav";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen">
      <TopNav />
      <main id="main-content" className="flex-1">
        {children}
      </main>
    </div>
  );
}
```

Create `app/(editor)/layout.tsx`:

```tsx
export default function EditorLayout({ children }: { children: React.ReactNode }) {
  return <div className="h-screen flex flex-col overflow-hidden">{children}</div>;
}
```

### Step 2.5 — Create `app/(main)/library/actions.ts`

```ts
"use server";

import { revalidatePath } from "next/cache";
import { getFile, putFile } from "@/lib/github-content";
import { LibrarySchema, type Novel } from "@/types/novel";

export async function getLibrary() {
  const { content } = await getFile("config/novels.json");
  return LibrarySchema.parse(JSON.parse(content));
}

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

export async function createNovel(formData: FormData) {
  const title = formData.get("title") as string;
  const genre = (formData.get("genre") as string) ?? "";

  const { content, sha } = await getFile("config/novels.json");
  const library = LibrarySchema.parse(JSON.parse(content));

  let id = slugify(title);
  // Ensure uniqueness
  const existingIds = new Set(library.novels.map((n) => n.id));
  let suffix = 1;
  while (existingIds.has(id)) {
    id = `${slugify(title)}-${suffix++}`;
  }

  const newNovel: Novel = { id, title, path: `content/${id}`, status: "planning" };
  library.novels.push(newNovel);

  // Update registry
  await putFile("config/novels.json", JSON.stringify(library, null, 2), sha, `feat: add novel ${id}`);

  // Create scaffold (new files — pass empty sha)
  const meta = { id, title, genre, goals: {}, chapterOrder: [] };
  await putFile(`content/${id}/meta.json`,          JSON.stringify(meta, null, 2), "", `chore: scaffold ${id}`);
  await putFile(`content/${id}/manuscript/.gitkeep`, "",                           "", `chore: scaffold ${id} manuscript`);
  await putFile(`content/${id}/lore/.gitkeep`,       "",                           "", `chore: scaffold ${id} lore`);

  revalidatePath("/library");
}
```

### Step 2.6 — Create `components/novels/status-badge.tsx`

```tsx
import { Badge } from "@/components/ui/badge";
import type { Novel } from "@/types/novel";

const statusLabels: Record<Novel["status"], string> = {
  planning: "Planning",
  writing:  "Writing",
  editing:  "Editing",
  complete: "Complete",
};

const statusClasses: Record<Novel["status"], string> = {
  planning: "border-[var(--status-planning)] text-[var(--status-planning)]",
  writing:  "border-[var(--status-writing)]  text-[var(--status-writing)]",
  editing:  "border-[var(--status-editing)]  text-[var(--status-editing)]",
  complete: "border-[var(--status-complete)] text-[var(--status-complete)]",
};

export function StatusBadge({ status }: { status: Novel["status"] }) {
  return (
    <Badge variant="outline" className={statusClasses[status]}>
      {statusLabels[status]}
    </Badge>
  );
}
```

### Step 2.7 — Create `components/novels/novel-card.tsx`

```tsx
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "./status-badge";
import type { Novel } from "@/types/novel";

export function NovelCard({ novel }: { novel: Novel }) {
  return (
    <Card className="hover:shadow-[var(--shadow-md)] transition-shadow duration-[120ms]">
      <CardHeader>
        <CardTitle className="font-serif text-xl">{novel.title}</CardTitle>
        <StatusBadge status={novel.status} />
      </CardHeader>
      <CardContent>
        <Link
          href={`/library/${novel.id}`}
          className="text-sm text-[var(--text-muted)] hover:text-[var(--accent)]"
        >
          Open →
        </Link>
      </CardContent>
    </Card>
  );
}
```

### Step 2.8 — Create `components/novels/new-novel-dialog.tsx`

Client component wrapping a shadcn Dialog with a form. Calls the `createNovel` Server Action.

```tsx
"use client";

import { useState, useTransition } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createNovel } from "@/app/(main)/library/actions";

export function NewNovelDialog() {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      await createNovel(formData);
      setOpen(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>New Novel</Button>
      </DialogTrigger>
      <DialogContent aria-labelledby="new-novel-title">
        <DialogHeader>
          <DialogTitle id="new-novel-title">New Novel</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <Label htmlFor="title">Title</Label>
            <Input id="title" name="title" required placeholder="The Void Chronicles" />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="genre">Genre (optional)</Label>
            <Input id="genre" name="genre" placeholder="Science Fiction" />
          </div>
          <Button type="submit" disabled={isPending}>
            {isPending ? "Creating…" : "Create"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

### Step 2.9 — Create `app/(main)/library/page.tsx`

```tsx
import { Suspense } from "react";
import { getLibrary } from "./actions";
import { NovelCard } from "@/components/novels/novel-card";
import { NewNovelDialog } from "@/components/novels/new-novel-dialog";
import { Skeleton } from "@/components/ui/skeleton";

function LibrarySkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {[...Array(3)].map((_, i) => (
        <Skeleton key={i} className="h-40 rounded-xl" />
      ))}
    </div>
  );
}

async function LibraryGrid() {
  const library = await getLibrary();

  if (library.novels.length === 0) {
    return (
      <div className="text-center py-24 text-[var(--text-muted)]">
        <p className="text-lg mb-4">No novels yet.</p>
        <NewNovelDialog />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {library.novels.map((novel) => (
        <NovelCard key={novel.id} novel={novel} />
      ))}
    </div>
  );
}

export default function LibraryPage() {
  return (
    <div className="max-w-[1200px] mx-auto px-6 py-10">
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-serif text-3xl font-semibold">Library</h1>
        <NewNovelDialog />
      </div>
      <Suspense fallback={<LibrarySkeleton />}>
        <LibraryGrid />
      </Suspense>
    </div>
  );
}
```

### Step 2.10 — Move `app/page.tsx` redirect

Ensure `app/page.tsx` still redirects to `/library`. The route group `(main)` does not change the URL, so `/library` is correct.

---

### Phase 2 Acceptance Checklist
- [ ] `/library` renders cards from `config/novels.json`
- [ ] "New Novel" dialog validates (title required), submits, closes
- [ ] After submission: GitHub content repo has `content/{id}/` folder structure
- [ ] After submission: `/library` shows the new card (cache revalidated)
- [ ] Empty state renders with "New Novel" button
- [ ] Skeleton shows during data fetch (test with slow network in DevTools)
- [ ] Dark mode applies correctly to all library components

---

## Phase 3 — The Writer's Workspace

**Goal:** Full editor at `/edit/[novelId]/[chapterSlug]` with CodeMirror, chapter sidebar, autosave, sync, drag-reorder, and Reader Mode.

### Step 3.1 — Install editor dependencies

```bash
npm install @uiw/react-codemirror @codemirror/lang-markdown
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
npm install react-markdown remark-gfm rehype-raw
npm install use-debounce
npm install vaul
npm install cmdk
```

### Step 3.2 — Create `lib/local-draft.ts`

```ts
const PREFIX = "draft";

export function draftKey(novelId: string, chapterSlug: string): string {
  return `${PREFIX}:${novelId}:${chapterSlug}`;
}

export interface Draft {
  content:   string;
  savedAt:   string; // ISO timestamp
}

export function saveDraft(novelId: string, chapterSlug: string, content: string): void {
  if (typeof window === "undefined") return;
  const draft: Draft = { content, savedAt: new Date().toISOString() };
  localStorage.setItem(draftKey(novelId, chapterSlug), JSON.stringify(draft));
}

export function loadDraft(novelId: string, chapterSlug: string): Draft | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(draftKey(novelId, chapterSlug));
  return raw ? JSON.parse(raw) : null;
}

export function clearDraft(novelId: string, chapterSlug: string): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(draftKey(novelId, chapterSlug));
}
```

### Step 3.3 — Create `lib/word-count.ts`

```ts
export function countWords(markdown: string): number {
  return markdown
    .replace(/```[\s\S]*?```/g, "")   // strip code blocks
    .replace(/`[^`]*`/g, "")           // strip inline code
    .replace(/\[\[([^\]]+)\]\]/g, "$1") // unwrap WikiLinks
    .replace(/[#*_~\[\]()>]/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}
```

### Step 3.4 — Create editor Server Actions `app/(editor)/edit/[novelId]/[chapterSlug]/actions.ts`

```ts
"use server";

import { revalidatePath } from "next/cache";
import { getFile, putFile } from "@/lib/github-content";

export async function loadChapter(novelId: string, chapterSlug: string) {
  const path = `content/${novelId}/manuscript/${chapterSlug}.md`;
  return getFile(path);
}

export async function syncChapter(novelId: string, chapterSlug: string, content: string) {
  const path = `content/${novelId}/manuscript/${chapterSlug}.md`;
  const { sha } = await getFile(path);
  await putFile(path, content, sha, `draft: update ${chapterSlug}`);
  revalidatePath(`/edit/${novelId}/${chapterSlug}`);
  return { ok: true, timestamp: new Date().toISOString() };
}

export async function reorderChapters(novelId: string, chapterOrder: string[]) {
  const metaPath = `content/${novelId}/meta.json`;
  const { content, sha } = await getFile(metaPath);
  const meta = JSON.parse(content);
  meta.chapterOrder = chapterOrder;
  await putFile(metaPath, JSON.stringify(meta, null, 2), sha, `chore: reorder chapters for ${novelId}`);
  revalidatePath(`/edit/${novelId}`);
}

export async function createChapter(novelId: string, title: string) {
  const metaPath = `content/${novelId}/meta.json`;
  const { content, sha } = await getFile(metaPath);
  const meta = JSON.parse(content);

  // Build slug: zero-padded index + slugified title
  const idx = (meta.chapterOrder?.length ?? 0) + 1;
  const slugBase = title.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  const slug = `${String(idx).padStart(2, "0")}-${slugBase}`;

  // Create the chapter file
  await putFile(`content/${novelId}/manuscript/${slug}.md`, `# ${title}\n\n`, "", `feat: new chapter ${slug}`);

  meta.chapterOrder = [...(meta.chapterOrder ?? []), slug];
  await putFile(metaPath, JSON.stringify(meta, null, 2), sha, `chore: register chapter ${slug}`);

  revalidatePath(`/edit/${novelId}`);
  return slug;
}
```

### Step 3.5 — Create `components/editor/sync-status-banner.tsx`

```tsx
"use client";

import { useEffect, useState } from "react";

type SyncState = "idle" | "syncing" | "success" | "error";

interface Props {
  state: SyncState;
  onRetry?: () => void;
}

export function SyncStatusBanner({ state, onRetry }: Props) {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (state !== "success") { setSeconds(0); return; }
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [state]);

  if (state === "idle") return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-0 inset-x-0 h-10 flex items-center justify-center text-sm
                 bg-[var(--bg-elevated)] border-t border-[var(--border-default)]
                 animate-[slideUp_200ms_ease-out]"
    >
      {state === "syncing" && (
        <span className="flex items-center gap-2">
          <span className="animate-spin h-3 w-3 border-2 border-current border-t-transparent rounded-full" />
          Syncing…
        </span>
      )}
      {state === "success" && (
        <span className="text-[var(--status-writing)]">
          Saved to GitHub. Page will refresh in ~{Math.max(0, 45 - seconds)}s.
        </span>
      )}
      {state === "error" && (
        <span className="flex items-center gap-3 text-destructive">
          Sync failed.
          {onRetry && <button onClick={onRetry} className="underline">Retry</button>}
        </span>
      )}
    </div>
  );
}
```

Add the keyframe to `globals.css`:
```css
@keyframes slideUp {
  from { transform: translateY(100%); opacity: 0; }
  to   { transform: translateY(0);    opacity: 1; }
}
```

### Step 3.6 — Create `components/editor/draft-restore-dialog.tsx`

```tsx
"use client";

import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
         AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
         AlertDialogTitle } from "@/components/ui/alert-dialog";

interface Props {
  open:       boolean;
  draftDate:  string; // ISO string
  onRestore:  () => void;
  onDiscard:  () => void;
}

export function DraftRestoreDialog({ open, draftDate, onRestore, onDiscard }: Props) {
  const formatted = new Date(draftDate).toLocaleString();
  return (
    <AlertDialog open={open}>
      <AlertDialogContent role="alertdialog" aria-modal="true">
        <AlertDialogHeader>
          <AlertDialogTitle>Unsaved local draft found</AlertDialogTitle>
          <AlertDialogDescription>
            A local draft from {formatted} is newer than the version on GitHub
            (possibly edited in Obsidian or another device). Restore your local
            draft or use the GitHub version?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onDiscard}>Use GitHub version</AlertDialogCancel>
          <AlertDialogAction onClick={onRestore}>Restore local draft</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
```

> Add `alert-dialog` to shadcn components: `npx shadcn@latest add alert-dialog`

### Step 3.7 — Create `components/editor/editor-client.tsx`

The core CodeMirror component with custom parchment theme, markdown language, and autosave.

```tsx
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { markdown } from "@codemirror/lang-markdown";
import { useDebouncedCallback } from "use-debounce";
import { saveDraft, loadDraft, clearDraft } from "@/lib/local-draft";
import { syncChapter } from "@/app/(editor)/edit/[novelId]/[chapterSlug]/actions";
import { DraftRestoreDialog } from "./draft-restore-dialog";
import { SyncStatusBanner } from "./sync-status-banner";
import { countWords } from "@/lib/word-count";

interface Props {
  novelId:      string;
  chapterSlug:  string;
  initialContent: string;
  fetchedAt:    string; // ISO — when the GitHub version was fetched
}

type SyncState = "idle" | "syncing" | "success" | "error";

export function EditorClient({ novelId, chapterSlug, initialContent, fetchedAt }: Props) {
  const [value, setValue]             = useState(initialContent);
  const [syncState, setSyncState]     = useState<SyncState>("idle");
  const [showRestore, setShowRestore] = useState(false);
  const [draftDate, setDraftDate]     = useState("");
  const wordCount                     = countWords(value);

  // On mount: check for newer local draft
  useEffect(() => {
    const draft = loadDraft(novelId, chapterSlug);
    if (draft && draft.savedAt > fetchedAt) {
      setDraftDate(draft.savedAt);
      setShowRestore(true);
    }
  }, [novelId, chapterSlug, fetchedAt]);

  const autosave = useDebouncedCallback((content: string) => {
    saveDraft(novelId, chapterSlug, content);
  }, 1500);

  const handleChange = useCallback((val: string) => {
    setValue(val);
    autosave(val);
  }, [autosave]);

  async function handleSync() {
    setSyncState("syncing");
    try {
      await syncChapter(novelId, chapterSlug, value);
      clearDraft(novelId, chapterSlug);
      setSyncState("success");
    } catch {
      setSyncState("error");
    }
  }

  // Cmd+S shortcut
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        handleSync();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [value]);

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-6 py-2 border-b border-[var(--border-default)] text-sm text-[var(--text-muted)]">
        <span>{wordCount} words</span>
        <button
          onClick={handleSync}
          disabled={syncState === "syncing"}
          className="px-3 py-1 rounded-md bg-[var(--accent)] text-white text-sm hover:bg-[var(--accent-hover)] disabled:opacity-50"
        >
          {syncState === "syncing" ? "Syncing…" : "Sync to GitHub"}
        </button>
      </div>

      {/* Editor */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-[var(--editor-max-width)] mx-auto py-20 px-4">
          <CodeMirror
            value={value}
            onChange={handleChange}
            extensions={[markdown()]}
            basicSetup={{
              lineNumbers:      false,
              foldGutter:       false,
              highlightActiveLine: false,
            }}
            style={{ fontFamily: "var(--font-serif)", fontSize: "19px", lineHeight: "1.8" }}
          />
        </div>
      </div>

      <DraftRestoreDialog
        open={showRestore}
        draftDate={draftDate}
        onRestore={() => {
          const draft = loadDraft(novelId, chapterSlug);
          if (draft) setValue(draft.content);
          setShowRestore(false);
        }}
        onDiscard={() => {
          clearDraft(novelId, chapterSlug);
          setShowRestore(false);
        }}
      />

      <SyncStatusBanner state={syncState} onRetry={handleSync} />
    </div>
  );
}
```

> **Note on Server Action import in client component:** The `syncChapter` import must use the full path. In Next.js 16 App Router this is allowed — the bundler ensures only the Server Action reference (not implementation) crosses to the client.

### Step 3.8 — Create `components/editor/chapter-sidebar.tsx`

Client component using dnd-kit for drag-and-drop. Accepts current chapter list from the server and calls `reorderChapters`.

```tsx
"use client";

import { useState } from "react";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Plus } from "lucide-react";
import Link from "next/link";
import { reorderChapters, createChapter } from "@/app/(editor)/edit/[novelId]/[chapterSlug]/actions";

interface Props {
  novelId:      string;
  chapterOrder: string[];
  activeSlug:   string;
}

function SortableChapter({ slug, novelId, isActive }: { slug: string; novelId: string; isActive: boolean }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: slug });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    scale:   isDragging ? "1.02" : "1",
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm cursor-pointer
        ${isActive ? "bg-[var(--accent)]/10 text-[var(--accent)]" : "hover:bg-[var(--bg-sidebar)]"}`}
    >
      <button
        {...attributes}
        {...listeners}
        aria-label={`Drag to reorder ${slug}`}
        className="text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-grab"
      >
        <GripVertical size={14} />
      </button>
      <Link href={`/edit/${novelId}/${slug}`} className="flex-1 truncate">
        {slug.replace(/^\d+-/, "").replace(/-/g, " ")}
      </Link>
    </div>
  );
}

export function ChapterSidebar({ novelId, chapterOrder: initial, activeSlug }: Props) {
  const [chapters, setChapters] = useState(initial);
  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor));

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = chapters.indexOf(active.id as string);
    const newIndex = chapters.indexOf(over.id as string);
    const reordered = arrayMove(chapters, oldIndex, newIndex);
    setChapters(reordered); // optimistic update
    await reorderChapters(novelId, reordered);
  }

  async function handleNewChapter() {
    const title = window.prompt("Chapter title:");
    if (!title) return;
    const slug = await createChapter(novelId, title);
    setChapters((prev) => [...prev, slug]);
  }

  return (
    <aside
      role="navigation"
      aria-label="Chapter list"
      className="w-[var(--sidebar-width)] border-r border-[var(--border-default)] flex flex-col bg-[var(--bg-sidebar)] overflow-y-auto shrink-0"
    >
      <div className="p-3 border-b border-[var(--border-default)] flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Chapters</span>
        <button onClick={handleNewChapter} aria-label="New chapter" className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
          <Plus size={16} />
        </button>
      </div>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={chapters} strategy={verticalListSortingStrategy}>
          <div className="flex flex-col gap-1 p-2">
            {chapters.map((slug) => (
              <SortableChapter key={slug} slug={slug} novelId={novelId} isActive={slug === activeSlug} />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </aside>
  );
}
```

### Step 3.9 — Create `components/editor/reader-pane.tsx`

```tsx
"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface Props {
  content: string;
}

export function ReaderPane({ content }: Props) {
  return (
    <div className="flex-1 overflow-y-auto">
      <article className="prose prose-lg max-w-[var(--editor-max-width)] mx-auto py-20 px-4 font-serif leading-[var(--leading-prose)]">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
      </article>
    </div>
  );
}
```

### Step 3.10 — Create the editor shell `app/(editor)/edit/[novelId]/[chapterSlug]/page.tsx`

Server component that fetches chapter content and passes it to the client shell.

```tsx
import { loadChapter } from "./actions";
import { getFile } from "@/lib/github-content";
import { EditorClient } from "@/components/editor/editor-client";
import { ChapterSidebar } from "@/components/editor/chapter-sidebar";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

interface Props {
  params: { novelId: string; chapterSlug: string };
}

export default async function EditorPage({ params }: Props) {
  const { novelId, chapterSlug } = await params;

  const [{ content, sha }, metaFile] = await Promise.all([
    loadChapter(novelId, chapterSlug),
    getFile(`content/${novelId}/meta.json`),
  ]);

  const meta = JSON.parse(metaFile.content);
  const chapterOrder: string[] = meta.chapterOrder ?? [];
  const fetchedAt = new Date().toISOString();

  return (
    <div className="flex flex-col h-full">
      {/* Editor top bar */}
      <div className="h-[var(--nav-height)] flex items-center px-4 gap-3 border-b border-[var(--border-default)] bg-[var(--bg-elevated)] shrink-0">
        <Link href="/library" aria-label="Back to library">
          <ArrowLeft size={18} />
        </Link>
        <span className="font-serif text-sm text-[var(--text-muted)]">
          {meta.title} / {chapterSlug.replace(/^\d+-/, "").replace(/-/g, " ")}
        </span>
      </div>

      {/* Main workspace */}
      <div className="flex flex-1 overflow-hidden">
        <ChapterSidebar
          novelId={novelId}
          chapterOrder={chapterOrder}
          activeSlug={chapterSlug}
        />
        <EditorClient
          novelId={novelId}
          chapterSlug={chapterSlug}
          initialContent={content}
          fetchedAt={fetchedAt}
        />
      </div>
    </div>
  );
}
```

> **Note on `params`:** In Next.js 16, `params` in server components is a Promise — always `await params` before destructuring. See `node_modules/next/dist/docs/` for the updated convention.

### Step 3.11 — Add Reader Mode toggle to EditorClient

Extend `EditorClient` to support Reader Mode. Add state `const [readerMode, setReaderMode] = useState(false)` and conditionally render `<ReaderPane>` or `<CodeMirror>` with a 150ms opacity transition. Add a toolbar button and `Cmd+Shift+R` shortcut.

This is an incremental edit to Step 3.7 — keep the same file, add the state and conditional render.

---

### Phase 3 Acceptance Checklist
- [ ] Editor loads chapter content on first visit
- [ ] Typing saves to localStorage within 2 seconds (check DevTools → Application → Local Storage)
- [ ] Syncing commits to GitHub and shows success banner with countdown
- [ ] `Cmd+S` triggers sync
- [ ] Refreshing page re-loads committed content
- [ ] Drag-and-drop reorder persists after page refresh (check `meta.json` in GitHub)
- [ ] "New Chapter" prompt creates file in GitHub + updates sidebar
- [ ] Reader Mode toggles on `Cmd+Shift+R`; GFM renders as prose
- [ ] Stale draft detection shows DraftRestoreDialog
- [ ] WikiLink `[[Name]]` syntax passes through untouched in both edit and reader modes

---

## Phase 4 — Polish

**Goal:** Word count analytics with heatmap, and export to PDF/Docx.

### Step 4.1 — Install Phase 4 dependencies

```bash
npm install @nivo/calendar @nivo/core
npm install @react-pdf/renderer
npm install docx
```

### Step 4.2 — Extend `syncChapter` action to record analytics

In `app/(editor)/edit/[novelId]/[chapterSlug]/actions.ts`, after a successful `putFile`, append a word-count entry to `analytics.json`:

```ts
import { countWords } from "@/lib/word-count";

// Inside syncChapter, after putFile succeeds:
const wordCount = countWords(content);
const today = new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"

let analyticsContent = "[]";
let analyticsSha = "";
try {
  const a = await getFile(`content/${novelId}/analytics.json`);
  analyticsContent = a.content;
  analyticsSha = a.sha;
} catch { /* file doesn't exist yet */ }

const entries: { date: string; wordCount: number }[] = JSON.parse(analyticsContent);
const existing = entries.find((e) => e.date === today);
if (existing) {
  existing.wordCount = wordCount;
} else {
  entries.push({ date: today, wordCount });
}

await putFile(
  `content/${novelId}/analytics.json`,
  JSON.stringify(entries, null, 2),
  analyticsSha,
  `chore: analytics ${novelId} ${today}`,
);
```

### Step 4.3 — Create analytics page `app/(main)/library/[novelId]/analytics/page.tsx`

```tsx
import { getFile } from "@/lib/github-content";
import { HeatmapCalendar } from "@/components/analytics/heatmap-calendar";

export default async function AnalyticsPage({ params }: { params: { novelId: string } }) {
  const { novelId } = await params;
  let entries: { date: string; wordCount: number }[] = [];
  try {
    const { content } = await getFile(`content/${novelId}/analytics.json`);
    entries = JSON.parse(content);
  } catch { /* no analytics yet */ }

  return (
    <div className="max-w-[1200px] mx-auto px-6 py-10">
      <h1 className="font-serif text-3xl font-semibold mb-8">Analytics</h1>
      <HeatmapCalendar data={entries} />
    </div>
  );
}
```

### Step 4.4 — Create `components/analytics/heatmap-calendar.tsx`

```tsx
"use client";

import { ResponsiveCalendar } from "@nivo/calendar";

interface Entry { date: string; wordCount: number }

export function HeatmapCalendar({ data }: { data: Entry[] }) {
  const nivoData = data.map((e) => ({ day: e.date, value: e.wordCount }));
  const thisYear = new Date().getFullYear();

  return (
    <div style={{ height: 200 }}>
      <ResponsiveCalendar
        data={nivoData}
        from={`${thisYear}-01-01`}
        to={`${thisYear}-12-31`}
        emptyColor="var(--parchment-100)"
        colors={["var(--parchment-200)", "var(--ink-200)", "var(--ink-400)", "var(--ink-600)"]}
        monthBorderColor="var(--border-default)"
        dayBorderColor="var(--border-default)"
      />
    </div>
  );
}
```

### Step 4.5 — Create export API route `app/api/export/[novelId]/route.ts`

```ts
import { getFile } from "@/lib/github-content";
import { exportPdf } from "@/lib/export-pdf";
import { exportDocx } from "@/lib/export-docx";

export async function GET(
  _req: Request,
  { params }: { params: { novelId: string } },
) {
  const { novelId } = await params;
  const url = new URL(_req.url);
  const format = url.searchParams.get("format") ?? "pdf";

  const { content: metaRaw } = await getFile(`content/${novelId}/meta.json`);
  const meta = JSON.parse(metaRaw);
  const order: string[] = meta.chapterOrder ?? [];

  const chapters = await Promise.all(
    order.map(async (slug) => {
      const { content } = await getFile(`content/${novelId}/manuscript/${slug}.md`);
      return { slug, content };
    }),
  );

  if (format === "docx") {
    const buffer = await exportDocx(meta.title, chapters);
    return new Response(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${novelId}.docx"`,
      },
    });
  }

  const buffer = await exportPdf(meta.title, chapters);
  return new Response(buffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${novelId}.pdf"`,
    },
  });
}
```

### Step 4.6 — Create `lib/export-pdf.ts` and `lib/export-docx.ts`

**`lib/export-pdf.ts`** — use `@react-pdf/renderer`:

```ts
import { Document, Page, Text, View, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import React from "react";

const styles = StyleSheet.create({
  page: { padding: 60, fontFamily: "Times-Roman" },
  title: { fontSize: 24, marginBottom: 24, textAlign: "center" },
  chapterTitle: { fontSize: 16, marginBottom: 12, marginTop: 24 },
  body: { fontSize: 12, lineHeight: 1.8 },
});

export async function exportPdf(
  title: string,
  chapters: { slug: string; content: string }[],
): Promise<Buffer> {
  const doc = React.createElement(
    Document,
    null,
    React.createElement(
      Page,
      { size: "A4", style: styles.page },
      React.createElement(Text, { style: styles.title }, title),
      ...chapters.map(({ slug, content }) =>
        React.createElement(
          View,
          { key: slug },
          React.createElement(Text, { style: styles.chapterTitle }, slug.replace(/^\d+-/, "").replace(/-/g, " ")),
          React.createElement(Text, { style: styles.body }, content.replace(/^#+\s*/gm, "")),
        ),
      ),
    ),
  );
  return renderToBuffer(doc);
}
```

**`lib/export-docx.ts`** — use `docx`:

```ts
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from "docx";

export async function exportDocx(
  title: string,
  chapters: { slug: string; content: string }[],
): Promise<Buffer> {
  const children: Paragraph[] = [
    new Paragraph({ text: title, heading: HeadingLevel.TITLE }),
  ];

  for (const { slug, content } of chapters) {
    children.push(new Paragraph({
      text: slug.replace(/^\d+-/, "").replace(/-/g, " "),
      heading: HeadingLevel.HEADING_1,
    }));
    for (const line of content.split("\n").filter(Boolean)) {
      children.push(new Paragraph({ children: [new TextRun(line.replace(/^#+\s*/, ""))] }));
    }
  }

  const doc = new Document({ sections: [{ children }] });
  return Packer.toBuffer(doc);
}
```

---

### Phase 4 Acceptance Checklist
- [ ] Each sync writes to `analytics.json` in GitHub
- [ ] Analytics page renders a calendar heatmap with correct colors
- [ ] `/api/export/[novelId]?format=pdf` downloads a PDF with all chapters
- [ ] `/api/export/[novelId]?format=docx` downloads a Docx file
- [ ] Export respects `chapterOrder` from `meta.json`

---

## File Tree — End State

```
novelgit/
├── app/
│   ├── layout.tsx                          ← Lora + ThemeProvider
│   ├── page.tsx                            ← redirect to /library
│   ├── globals.css                         ← full token set + keyframes
│   ├── (main)/
│   │   ├── layout.tsx                      ← TopNav wrapper
│   │   └── library/
│   │       ├── page.tsx
│   │       ├── actions.ts
│   │       └── [novelId]/
│   │           └── analytics/
│   │               └── page.tsx
│   ├── (editor)/
│   │   ├── layout.tsx
│   │   └── edit/
│   │       └── [novelId]/
│   │           └── [chapterSlug]/
│   │               ├── page.tsx
│   │               └── actions.ts
│   └── api/
│       └── export/
│           └── [novelId]/
│               └── route.ts
├── components/
│   ├── theme-provider.tsx
│   ├── top-nav.tsx
│   ├── dark-mode-toggle.tsx
│   ├── novels/
│   │   ├── novel-card.tsx
│   │   ├── status-badge.tsx
│   │   └── new-novel-dialog.tsx
│   ├── editor/
│   │   ├── editor-client.tsx
│   │   ├── chapter-sidebar.tsx
│   │   ├── reader-pane.tsx
│   │   ├── sync-status-banner.tsx
│   │   └── draft-restore-dialog.tsx
│   └── analytics/
│       └── heatmap-calendar.tsx
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
└── .env.local
```

---

## Cross-Phase Notes

- **`params` is a Promise in Next.js 16** — always `await params` in server components and route handlers before accessing properties.
- **Never pass `sha: ""`** to `putFile` for existing files — always call `getFile` first to get the current SHA.
- **Pass `sha: undefined`** (not `""`) for new file creation — the Octokit API requires the field to be absent.
- **`revalidatePath`** must be called in Server Actions, not Route Handlers.
- **No `tailwind.config.ts`** — all theme customization goes in `globals.css` via `@theme inline` and `@plugin`.
- **shadcn components** land in `components/ui/` and must not be edited directly — compose them in domain components.
- **WikiLink `[[Name]]`** must pass through the editor and reader untouched; do not normalize or auto-link in Phase 3.
