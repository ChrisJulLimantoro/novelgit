# AI + RAG Implementation Plan

## Context

The user has novels with existing manuscripts but no lore. This plan builds the full lore system from scratch: a structured world-bible that writers can populate (manually or via AI scaffold), reference while writing, and query via natural language. The AI layer uses Claude for text generation and Voyage AI for semantic embeddings stored directly in GitHub — no external vector database.

**Core user journey being solved:**
> Writer has chapters. Wants to organise world-building notes, have AI scaffold entries, and look up lore without leaving the editor.

---

## New Packages

```bash
npm install groq-sdk gray-matter
```

**Embeddings:** Use the Voyage **HTTPS API** from [`lib/ai/embeddings.ts`](../../lib/ai/embeddings.ts) (`fetch` to `https://api.voyageai.com/v1/embeddings`). Do **not** add the `voyageai` npm SDK — its published ESM build relies on directory imports (`export * from "../api"`) that fail under Node’s ESM loader when the package is externalized (`ERR_UNSUPPORTED_DIR_IMPORT`) and fail to resolve under Next/Turbopack when bundled (`Can't resolve '../api'`). Same API key (`VOYAGE_API_KEY`); no LangChain. No external vector DB. No additional Next.js plugins.

**Hybrid retrieval (current implementation):**

| Index | Embedder | Query at chat time |
|-------|----------|-------------------|
| `lore-index.json` | Voyage `voyage-3` | `embedText()` → Voyage |
| `manuscript-rag-index.json` | [`lib/ai/embeddings-local.ts`](../../lib/ai/embeddings-local.ts) — `@xenova/transformers`, `Xenova/all-MiniLM-L6-v2` (384-d, mean pool + L2 norm) | `embedTextLocal()` → same model |

Do **not** use one query vector for both indexes (dimension and geometry differ). [`app/api/ai/[novelId]/chat/route.ts`](../../app/api/ai/[novelId]/chat/route.ts) embeds the user message **twice** when both sides have semantic vectors.

`manuscript-rag-index.json` includes `"embedder": "Xenova/all-MiniLM-L6-v2"` at the root. Chat only runs cosine RAG on manuscript rows when `embedder` matches; older files without this field (or with Voyage-sized vectors from a prior version) fall back to first-`K` chunks until **Reindex RAG** is run again.

---

## New Environment Variables

```bash
# .env.example additions
GROQ_API_KEY=gsk_...
VOYAGE_API_KEY=pa-...
```

Server-side only — never `NEXT_PUBLIC_` prefixed.

---

## Storage Design

```
content/{novelId}/
  manuscript/{slug}.md          ← existing chapters (unchanged)
  lore/{slug}.md                ← NEW: one file per lore entry
  lore-index.json               ← NEW: all entry metadata + 1024-dim embeddings
```

**Lore entry file format** (`lore/{slug}.md`):
```markdown
---
id: "anna-kovacs"
type: "character"
name: "Anna Kovacs"
tags: ["protagonist", "detective"]
created: "2026-04-07"
---

## Description
...

## History
...
```

**`lore-index.json`** — enables in-memory cosine similarity; no external infra needed:
```json
{
  "entries": [
    {
      "id": "anna-kovacs",
      "type": "character",
      "name": "Anna Kovacs",
      "tags": ["protagonist"],
      "embedding": [0.123, ...],
      "updatedAt": "2026-04-07"
    }
  ]
}
```

For < 100 lore entries per novel, in-memory cosine similarity search takes < 1 ms.

---

## File Map

```
types/
  lore.ts                                       NEW — Zod schemas
lib/
  ai/
    client.ts                                   NEW — Anthropic singleton
    embeddings.ts                               NEW — embedText(), embedBatch()
    rag.ts                                      NEW — topKResults() (pure cosine similarity)
  lore.ts                                       NEW — GitHub CRUD for lore files
  github-content.ts                             MODIFY — add deleteFile() wrapper
  ids.ts                                        MODIFY — add assertSafeLoreSlug()
app/
  (main)/library/[novelId]/
    page.tsx                                    MODIFY — add Lore tab / link
    lore/
      page.tsx                                  NEW — Lore management page
      actions.ts                                NEW — Server Actions (CRUD + embed)
  (editor)/edit/[novelId]/[chapterSlug]/
    ai-actions.ts                               NEW — searchLore() server action
  api/ai/[novelId]/
    scaffold-lore/route.ts                      NEW — POST, Groq scaffold (non-streaming)
    chat/route.ts                               NEW — POST, streaming SSE chat + RAG (Groq)
    reindex/route.ts                            NEW — POST, batch re-embed all lore
components/
  lore/
    lore-entry-form.tsx                         NEW — create/edit form with AI scaffold button
    lore-scaffold-preview.tsx                   NEW — raw/rendered side-by-side preview
    lore-type-icon.tsx                          NEW — icon per lore type (User/MapPin/Users/Zap/Package)
  editor/
    lore-sidebar.tsx                            NEW — search + browse lore in editor
    ai-sidebar.tsx                              NEW — streaming chat UI
    wikilink-extension.ts                       NEW — TipTap Mark for [[...]] patterns
    editor-shell.tsx                            MODIFY — add lore/AI sidebar state
    editor-toolbar.tsx                          MODIFY — add Lore + AI toggle buttons
    editor-client.tsx                           MODIFY — register WikiLinkExtension + DOM delegation
.env.example                                    MODIFY — add AI keys
```

---

## Types — `types/lore.ts`

```ts
import { z } from "zod";

export const LORE_TYPES = ["character", "location", "faction", "event", "item"] as const;
export type LoreType = (typeof LORE_TYPES)[number];

export const LoreEntryMetaSchema = z.object({
  id:      z.string(),
  type:    z.enum(LORE_TYPES),
  name:    z.string(),
  tags:    z.array(z.string()).default([]),
  created: z.string(),                       // ISO date yyyy-mm-dd
});
export type LoreEntryMeta = z.infer<typeof LoreEntryMetaSchema>;

export const LoreEntrySchema = LoreEntryMetaSchema.extend({
  body: z.string(),   // markdown body after frontmatter strip
  sha:  z.string(),   // GitHub SHA for optimistic locking
});
export type LoreEntry = z.infer<typeof LoreEntrySchema>;

export const LoreIndexRecordSchema = z.object({
  id:        z.string(),
  type:      z.enum(LORE_TYPES),
  name:      z.string(),
  tags:      z.array(z.string()).default([]),
  embedding: z.array(z.number()).length(1024),
  updatedAt: z.string(),
});
export type LoreIndexRecord = z.infer<typeof LoreIndexRecordSchema>;

export const LoreIndexSchema = z.object({
  entries: z.array(LoreIndexRecordSchema),
});
export type LoreIndex = z.infer<typeof LoreIndexSchema>;

export const ChatMessageSchema = z.object({
  role:    z.enum(["user", "assistant"]),
  content: z.string(),
});
export type ChatMessage = z.infer<typeof ChatMessageSchema>;
```

---

## Core Libs

### `lib/ai/client.ts`
Mirrors `lib/github.ts` singleton pattern:
```ts
import Groq from "groq-sdk";
if (!process.env.GROQ_API_KEY) throw new Error("GROQ_API_KEY is not configured");
export const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
```

Model used throughout: `llama-3.3-70b-versatile` (high quality, fast via Groq, OpenAI-compatible API).

### `lib/ai/embeddings.ts`
```ts
// Single embed — called on create/update
export async function embedText(text: string): Promise<number[]>
// Batch — called by reindex route
export async function embedBatch(texts: string[]): Promise<number[][]>
```
Model: `voyage-3` (1024 dimensions).
Input format: `"${type} ${name}: ${body.slice(0, 500)}"` — maximises semantic quality.

### `lib/ai/rag.ts`
```ts
// Pure synchronous in-memory cosine similarity — no network, unit-testable
export function topKResults(
  index: LoreIndex,
  queryEmbedding: number[],
  k = 5,
): LoreIndexRecord[]
```

### `lib/lore.ts`
GitHub CRUD layer. Uses `gray-matter` for frontmatter parse/stringify. Follows `getFile`/`putFile` patterns exactly.

```ts
export async function getLoreEntry(novelId, slug): Promise<LoreEntry>
export async function putLoreEntry(novelId, meta, body, sha, commitMsg): Promise<void>
export async function deleteLoreEntry(novelId, slug): Promise<void>   // uses deleteFile()
export async function getLoreIndex(novelId): Promise<LoreIndex>        // returns {entries:[]} on 404
export async function updateLoreIndex(novelId, index): Promise<void>   // read SHA → write
export function slugifyLoreName(name): string
```

**Add to `lib/github-content.ts`:**
```ts
export async function deleteFile(path: string, sha: string, message: string): Promise<void>
```
Wraps `octokit.rest.repos.deleteFile`. Avoids importing octokit directly inside `lib/lore.ts`.

**Add to `lib/ids.ts`:**
```ts
export function assertSafeLoreSlug(slug: string): void
// regex: /^[a-z0-9][a-z0-9-]{0,127}$/
```

---

## Server Actions — `app/(main)/library/[novelId]/lore/actions.ts`

All: `requireAuth()` + `assertSafeNovelId()` + `revalidatePath()`. Same pattern as `library/actions.ts`.

```ts
// Create: putLoreEntry → embedText → push to index → updateLoreIndex
createLoreEntry({ novelId, name, type, tags, body }): Promise<{ slug: string }>

// Update: putLoreEntry → re-embed → update index record → updateLoreIndex
updateLoreEntry({ novelId, slug, name, type, tags, body, sha }): Promise<void>

// Delete: deleteLoreEntry → filter from index → updateLoreIndex
deleteLoreEntryAction({ novelId, slug }): Promise<void>

// List: reads lore-index.json only (no individual file reads)
listLoreEntriesAction(novelId): Promise<{ id, type, name, tags, updatedAt }[]>
```

### `app/(editor)/edit/[novelId]/[chapterSlug]/ai-actions.ts`

```ts
// Embed query → cosine search index → fetch LoreEntry[] in parallel
export async function searchLore(novelId, query, k = 5): Promise<LoreEntry[]>
```

---

## API Routes

### `POST /api/ai/[novelId]/scaffold-lore`
Non-streaming. Auth via `isValidAuthCookie`.
- Input: `{ name, type, tags }`
- Calls `llama-3.3-70b-versatile` via Groq with type-specific system prompt
- Output: `{ markdown: string }` — body only, no frontmatter

**Section templates per lore type:**
| Type | Sections |
|------|----------|
| character | Description / Appearance / Personality / History / Relationships / Notes |
| location | Description / Geography / History / Notable Features / Inhabitants / Notes |
| faction | Overview / Goals / Structure / History / Key Members / Notes |
| event | Summary / Causes / Key Participants / Consequences / Timeline / Notes |
| item | Description / Origin / Properties / History / Current Location / Notes |

Claude instruction: leave `[Describe here]` placeholders under each heading. Do not invent facts not provided.

### `POST /api/ai/[novelId]/chat`
Streaming. Auth via cookie.
- Input: `{ messages: ChatMessage[] }` (max 50)
- Embeds last user message → top-5 lore entries via RAG → builds system prompt → streams via Groq (`llama-3.3-70b-versatile`, `stream: true`)
- Response: `text/plain; charset=utf-8` with `Cache-Control: no-cache`
- Client reads with `response.body.getReader()`
- Groq SDK exposes an async iterable for streaming chunks identical to OpenAI's pattern

### `POST /api/ai/[novelId]/reindex`
Non-streaming. Auth via cookie.
- Fetches all entries, re-embeds with `embedBatch`, updates `lore-index.json`
- Output: `{ reindexed: number }`

---

## UI/UX — Full Specification

All components follow the existing design system: CSS variables, `font-serif` for content, `font-sans` for UI, `font-mono` for metadata. Buttons use the existing `Button` component. Dialogs use the existing `Dialog` + `AlertDialog` primitives. Spacing scale: gap-1.5, gap-2, gap-3, gap-4, gap-5.

---

### 1. Novel Detail Page — Add Lore Entry Point

**File to modify:** `app/(main)/library/[novelId]/page.tsx`

Below the chapter list section, add a **Lore** section with the same visual treatment as Chapters:

```
── Chapters ──────────────────────── [+ New Chapter]
  01  Prologue                         Edit →
  02  The Beginning                    Edit →

── Lore ──────────────────────────── [+ Manage Lore →]
  [character]  Anna Kovacs
  [location]   Budapest 1944
  (if empty: "No lore entries yet. Add world-building notes.")
```

- The "Manage Lore →" link goes to `/library/{novelId}/lore`
- Lore entries shown as a short preview list (max 5, from `lore-index.json`)
- Each entry shows: type icon + name
- Clicking an entry goes to `/library/{novelId}/lore?entry={id}` (deep link to open that entry)

**Visual:**
```tsx
// Lore entry row — same link style as chapters
<div className="flex items-center gap-3 px-4 py-2.5 rounded-lg hover:bg-[var(--bg-sidebar)] transition-colors">
  <LoreTypeIcon type={entry.type} className="h-3.5 w-3.5 text-[var(--text-muted)] shrink-0" />
  <span className="font-sans text-sm text-[var(--text-primary)]">{entry.name}</span>
  <Badge className="ml-auto">{entry.type}</Badge>
</div>
```

---

### 2. Lore Management Page — `/library/{novelId}/lore`

**File:** `app/(main)/library/[novelId]/lore/page.tsx`

**Layout (desktop):** Two-column split — list on left (320px fixed), detail/edit on right (flexible).  
**Layout (mobile):** Stack — list view, tap entry to open detail (back button to return to list).

```
┌─────────────────────────────────────────────────────────┐
│  ← My Novel                                             │
│  World-Building                        [+ New Entry]    │
├────────────────────────┬────────────────────────────────┤
│  [all] [char] [loc]..  │                                │
│  Search lore...        │   ← Select an entry            │
│  ────────────────────  │      or create a new one       │
│  ● Anna Kovacs         │                                │
│    character           │                                │
│  ● Budapest 1944       │                                │
│    location            │                                │
│  ● The Resistance      │                                │
│    faction             │                                │
└────────────────────────┴────────────────────────────────┘
```

**Left pane (list):**
- Type filter chips at top: `All` `Character` `Location` `Faction` `Event` `Item`
- Search box below (client-side filter against names/tags — no network call)
- Entry rows: `LoreTypeIcon` + name + type badge + `updatedAt` relative date
- Active entry: `bg-[var(--accent)]/10 border-l-2 border-[var(--accent)]`

**Right pane (detail):**

*Empty state:*
```
[BookOpen icon, large, muted]
Select an entry from the list,
or create your first lore entry.
[+ New Entry] (primary button)
```

*Entry detail view:*
```
┌──────────────────────────────────────────────────────┐
│ [User icon]  Anna Kovacs          [Edit] [Delete]    │
│ character  · protagonist, detective  · Apr 7, 2026   │
├──────────────────────────────────────────────────────┤
│                                                      │
│  ## Description                                      │
│  Anna Kovacs is a Budapest detective...              │
│                                                      │
│  ## History                                          │
│  ...                                                 │
└──────────────────────────────────────────────────────┘
```
- Body rendered via `react-markdown` with `prose` classes
- "Edit" opens `LoreEntryForm` in-place (replaces the detail view with the form)
- "Delete" opens `AlertDialog` for confirmation

---

### 3. Create / Edit — `LoreEntryForm`

**File:** `components/lore/lore-entry-form.tsx`  
**Props:** `{ novelId, initial?: LoreEntry, onSuccess, onCancel }`

The form renders in-place inside the right pane of the lore management page (not a modal). On mobile, it takes the full screen.

```
┌──────────────────────────────────────────────────────┐
│ Name                                                 │
│ [Anna Kovacs                                       ] │
│                                                      │
│ Type                                                 │
│ [Character] [Location] [Faction] [Event] [Item]      │
│  (pill toggles, same as genre selector)              │
│                                                      │
│ Tags  (optional)                                     │
│ [protagonist ×] [detective ×] [+ add tag...]         │
│                                                      │
│ Description                          [✨ Generate]   │
│ ┌────────────────────────────────────────────────┐   │
│ │ ## Description                                 │   │
│ │ [Describe here]                                │   │
│ │                                                │   │
│ │ ## History                                     │   │
│ │ [Describe here]                                │   │
│ └────────────────────────────────────────────────┘   │
│                                                      │
│ [Cancel]                              [Save Entry]   │
└──────────────────────────────────────────────────────┘
```

**"✨ Generate" button (AI scaffold):**
- Label: `Sparkles` icon + "Generate scaffold"
- State during generation: spinner + "Generating…" (disabled)
- On success: opens `LoreScaffoldPreview` below the textarea (not a modal)
- On error: small red error text under the button

**Tag input:**
- Inline chip input: type tag → press Enter or comma → chip appears with × remove button
- Uses controlled `string[]` state

**Save button:**
- Disabled when name is empty or type not selected
- Shows spinner + "Saving…" during `useTransition`
- On success: calls `onSuccess(slug)` → detail view shows the saved entry

**Inline scaffold preview flow:**
```
[After clicking Generate...]

┌──────────────────────────────────────────────────────┐
│ Name, Type, Tags fields (unchanged)                  │
├──────────────────────────────────────────────────────┤
│ AI Scaffold Preview                  [✓ Use] [✗ Discard] │
├──────────────┬───────────────────────────────────────┤
│ Raw markdown │ Rendered preview                      │
│ (editable)   │                                       │
│              │ ## Description                        │
│ ## Description│ [Describe here]                      │
│ [Describe    │                                       │
│  here]       │ ## History                            │
│              │ [Describe here]                        │
└──────────────┴───────────────────────────────────────┘
```
- "✓ Use" → copies raw markdown into main textarea, collapses preview
- "✗ Discard" → collapses preview without changing textarea

---

### 4. `LoreScaffoldPreview` Component

**File:** `components/lore/lore-scaffold-preview.tsx`  
**Props:** `{ markdown, onChange, onAccept, onReject }`

```tsx
// Layout: side-by-side on md+, stacked on mobile
<div className="rounded-lg border border-[var(--border-default)] overflow-hidden">
  <div className="flex items-center justify-between px-3 py-2 bg-[var(--bg-sidebar)] border-b border-[var(--border-default)]">
    <span className="text-xs font-medium text-[var(--text-muted)]">AI Scaffold Preview</span>
    <div className="flex gap-2">
      <Button size="xs" onClick={onReject} variant="ghost">✗ Discard</Button>
      <Button size="xs" onClick={() => onAccept(markdown)}>✓ Use this</Button>
    </div>
  </div>
  <div className="grid md:grid-cols-2 divide-x divide-[var(--border-default)]">
    <textarea value={markdown} onChange={(e) => onChange(e.target.value)}
      className="w-full p-3 text-sm font-mono bg-transparent resize-none min-h-48 outline-none" />
    <div className="p-3 prose prose-sm max-w-none overflow-y-auto max-h-64">
      <ReactMarkdown>{markdown}</ReactMarkdown>
    </div>
  </div>
</div>
```

---

### 5. `LoreTypeIcon` Component

**File:** `components/lore/lore-type-icon.tsx`

Maps each lore type to a Lucide icon:
| Type | Icon |
|------|------|
| character | `User` |
| location | `MapPin` |
| faction | `Users` |
| event | `Zap` |
| item | `Package` |

```tsx
import { User, MapPin, Users, Zap, Package } from "lucide-react";
const ICONS = { character: User, location: MapPin, faction: Users, event: Zap, item: Package };
export function LoreTypeIcon({ type, ...props }: { type: LoreType } & LucideProps) {
  const Icon = ICONS[type];
  return <Icon {...props} />;
}
```

---

### 6. Editor Toolbar — Add Lore + AI Buttons

**File to modify:** `components/editor/editor-toolbar.tsx`

Add two buttons after the existing sidebar toggle button:

```
[≡ sidebar] | [Bold] [Italic] ... | [Aa] [theme] | [BookOpen] [Sparkles] | [Sync ↑]
```

- `BookOpen` → toggles lore sidebar (tooltip: "Lore")
- `Sparkles` → toggles AI chat sidebar (tooltip: "Ask AI")
- Active state: same `bg-[var(--accent)]/10 text-[var(--accent)]` pattern as other buttons

**New props added to `EditorToolbar`:**
```ts
loreSidebarOpen: boolean;
onToggleLore:    () => void;
aiSidebarOpen:   boolean;
onToggleAi:      () => void;
```

---

### 7. Editor Shell — Sidebar State Management

**File to modify:** `components/editor/editor-shell.tsx`

New state:
```ts
type RightPanel = "lore" | "ai" | null;
const [rightPanel, setRightPanel]       = useState<RightPanel>(null);
const [wikiLinkTarget, setWikiLinkTarget] = useState<string | undefined>();
```

Layout:
```
┌────────────────────────────────────────────────────┐
│  Toolbar (full width, top)                         │
├──────────┬─────────────────────┬───────────────────┤
│ Chapters │  Editor             │  Lore  /  AI      │
│ Sidebar  │  (flex-1)           │  Sidebar (300px)  │
│ (left)   │                     │  (right, optional)│
└──────────┴─────────────────────┴───────────────────┘
```

Right sidebar:
- Slides in from right with CSS transition (`translate-x-full` → `translate-x-0`)
- Fixed width: `w-[300px]` on desktop, full-width overlay on mobile
- Toggled by `rightPanel` state
- `wikiLinkTarget` passed to `LoreSidebar` for WikiLink resolution

---

### 8. Lore Sidebar (in Editor)

**File:** `components/editor/lore-sidebar.tsx`  
**Props:** `{ novelId, open, onClose, highlight?: string }`

```
┌────────────────────────────────────┐
│ Lore                          [×]  │
│ [🔍 Search lore...]                │
├────────────────────────────────────┤
│  ● Anna Kovacs                     │  ← top RAG result if highlight set
│    character · protagonist         │
│  ● The Resistance                  │
│    faction                         │
├────────────────────────────────────┤
│ [+ New Lore Entry]  [Open Lore →]  │  ← link to /library/{novelId}/lore
└────────────────────────────────────┘
```

**Interaction flow:**
1. If `highlight` is set (WikiLink clicked): auto-runs `searchLore(novelId, highlight)` on mount — shows top results with highlighted match
2. Search box: debounced 300ms → calls `searchLore(novelId, query)` → updates results list
3. Clicking a result: expands inline to show full entry body (react-markdown)
4. Collapsed result: type icon + name + type badge + first 60 chars of body as muted preview text

**Expanded entry view:**
```
┌────────────────────────────────────┐
│ ← Back to results                  │
│ [User]  Anna Kovacs                │
│ character · protagonist, detective │
├────────────────────────────────────┤
│                                    │
│ ## Description                     │
│ Anna Kovacs is a detective...      │
│                                    │
│ ## History                         │
│ ...                                │
│                                    │
│ [Open in Lore →]                   │
└────────────────────────────────────┘
```

**Empty / loading states:**
- While searching: spinner (same 3-circle spinner style as SyncStatus)
- No results: "No lore entries found. Try a different search." + "+ New Entry" button
- No lore at all: "No lore entries yet." + link to lore page

---

### 9. AI Chat Sidebar (in Editor)

**File:** `components/editor/ai-sidebar.tsx`  
**Props:** `{ novelId, open, onClose }`

```
┌────────────────────────────────────┐
│ Ask AI                        [×]  │
│ Grounded in your lore              │
├────────────────────────────────────┤
│                                    │
│         [Sparkles icon]            │
│   Ask anything about your novel.   │
│   Answers draw from your lore.     │
│                                    │
├────────────────────────────────────┤ ← messages appear here (scrollable)
│ You: Who is Anna's mentor?         │
│                                    │
│ Claude: Based on your lore, Anna's │
│ mentor is...                       │
├────────────────────────────────────┤
│ [Message...            ] [Send →]  │
│ [Clear chat]                       │
└────────────────────────────────────┘
```

**Streaming behaviour:**
- User submits → message appended immediately → assistant bubble appears with a blinking cursor
- Tokens stream in via `response.body.getReader()` — content grows in real-time
- On stream end: cursor disappears
- On error: error message in red with "Try again" button

**Message bubble styling:**
```tsx
// User message
<div className="flex justify-end">
  <div className="max-w-[85%] rounded-xl rounded-tr-sm bg-[var(--accent)]/10 px-3 py-2 text-sm">
    {message.content}
  </div>
</div>

// Assistant message
<div className="flex justify-start">
  <div className="max-w-[85%] rounded-xl rounded-tl-sm bg-[var(--bg-sidebar)] px-3 py-2 text-sm">
    <ReactMarkdown className="prose prose-sm max-w-none">{message.content}</ReactMarkdown>
    {isStreaming && <span className="inline-block w-1 h-3 bg-current animate-pulse ml-0.5" />}
  </div>
</div>
```

---

### 10. WikiLink TipTap Extension

**File:** `components/editor/wikilink-extension.ts`

TipTap `Mark.create` (inline, within paragraphs):

```ts
export const WikiLinkExtension = Mark.create<{ onLinkClick: (name: string) => void }>({
  name: "wikiLink",
  // addAttributes: stores { name }
  // addInputRules: regex /\[\[([^\]]+)\]\]/ → applies mark
  // renderHTML: <span data-wikilink="{name}" class="text-[var(--accent)] underline underline-offset-2 cursor-pointer">
  // addMarkdownSpec: emits [[{name}]] in serialized markdown (for tiptap-markdown round-trip)
})
```

**Click handling in `editor-client.tsx`:**
```ts
useEffect(() => {
  const container = editorContainerRef.current;
  if (!container) return;
  const handler = (e: MouseEvent) => {
    const target = (e.target as HTMLElement).closest("[data-wikilink]");
    if (target) {
      const name = target.getAttribute("data-wikilink");
      if (name) props.onWikiLinkClick(name);
    }
  };
  container.addEventListener("click", handler);
  return () => container.removeEventListener("click", handler);
}, [props.onWikiLinkClick]);
```

**Critical verification:** After implementing, type `[[Anna Kovacs]]` in editor, sync to GitHub, then inspect the raw `.md` file. It must contain `[[Anna Kovacs]]` verbatim — not HTML or any other encoding. If `tiptap-markdown` doesn't serialise marks with `addMarkdownSpec`, implement a custom serialiser spec.

---

## Implementation Order

Build bottom-up so each phase is independently verifiable.

### Phase 1 — Lore CRUD (no AI)

1. `types/lore.ts`
2. `lib/ids.ts` — add `assertSafeLoreSlug`
3. `lib/github-content.ts` — add `deleteFile`
4. `lib/lore.ts`
5. `app/(main)/library/[novelId]/lore/actions.ts` — stub out `embedText` calls with `[] as number[]` placeholder
6. `components/lore/lore-type-icon.tsx`
7. `components/lore/lore-entry-form.tsx` — no AI scaffold button yet
8. `app/(main)/library/[novelId]/lore/page.tsx`
9. `app/(main)/library/[novelId]/page.tsx` — add Lore section at bottom

**Checkpoint:** Can create, view, edit, delete lore entries. `lore-index.json` written with empty embeddings.

---

### Phase 2 — AI Scaffold

10. `lib/ai/client.ts`
11. `app/api/ai/[novelId]/scaffold-lore/route.ts`
12. `components/lore/lore-scaffold-preview.tsx`
13. Activate "✨ Generate" button in `lore-entry-form.tsx`

**Checkpoint:** Click Generate → scaffold markdown appears in preview → accept fills the form body.

---

### Phase 3 — Embeddings + RAG

14. `lib/ai/embeddings.ts`
15. `lib/ai/rag.ts`
16. Activate `embedText` calls in `lore/actions.ts` (remove stub)
17. `app/api/ai/[novelId]/reindex/route.ts`
18. `app/(editor)/edit/[novelId]/[chapterSlug]/ai-actions.ts`

**Checkpoint:** After creating an entry, `lore-index.json` has `embedding` array of length 1024. `searchLore("Anna")` returns Anna as top result.

---

### Phase 4 — Editor Integration (WikiLinks + Lore Sidebar)

19. `components/editor/wikilink-extension.ts`
20. `components/editor/lore-sidebar.tsx`
21. Modify `editor-shell.tsx` — add `rightPanel` state + `LoreSidebar` slot
22. Modify `editor-toolbar.tsx` — add `BookOpen` button
23. Modify `editor-client.tsx` — register `WikiLinkExtension` + DOM click delegation

**Checkpoint:** Type `[[Anna Kovacs]]` → styled link. Sync → raw markdown has `[[Anna Kovacs]]`. Click → lore sidebar opens with Anna as top result.

---

### Phase 5 — AI Chat

24. `app/api/ai/[novelId]/chat/route.ts`
25. `components/editor/ai-sidebar.tsx`
26. Modify `editor-toolbar.tsx` — add `Sparkles` button
27. Wire `aiSidebarOpen` through shell/toolbar

**Checkpoint:** Open AI sidebar → ask "who is Anna's mentor?" → Claude streams a response grounded in lore.

---

## Verification Checklist

| Check | Expected result |
|-------|-----------------|
| Create entry | `lore/{slug}.md` appears in GitHub with correct YAML frontmatter |
| Index update | `lore-index.json` contains entry with `embedding.length === 1024` |
| Edit (no 409) | SHA read before write — no GitHub conflict error |
| Delete | File gone from GitHub; entry removed from `lore-index.json` |
| Scaffold endpoint | POST `{ name: "Anna", type: "character" }` → 200 with 6 section headings |
| Scaffold preview | Raw textarea and rendered markdown shown side-by-side |
| Scaffold accept | Clicking "Use this" replaces form body with scaffold |
| RAG search | `searchLore("Anna")` → Anna Kovacs is top-1 result |
| WikiLink render | `[[Anna Kovacs]]` in editor → styled underlined span |
| WikiLink round-trip | Sync → raw GitHub `.md` contains `[[Anna Kovacs]]` verbatim |
| WikiLink click | Lore sidebar opens, Anna shown as top result |
| Chat stream | Tokens arrive progressively in AI sidebar |
| Chat grounding | System prompt contains lore context (verify via console.log in dev) |
| Reindex | POST /reindex → all embeddings refreshed in `lore-index.json` |
| Mobile lore page | List and detail stack vertically; back button works |
| Empty state | Novel with no lore shows correct empty states everywhere |

---

## Key Trade-offs

| Decision | Rationale |
|----------|-----------|
| Embeddings in `lore-index.json` (GitHub) | No external infra; consistent with existing storage; scales to ~500 entries |
| In-memory cosine similarity | Corpus is small; < 1ms at 100 entries; no network hop |
| No LangChain | Direct SDK usage; fewer abstractions; easier to debug |
| `gray-matter` for frontmatter | Robust parse/stringify; no native deps |
| GitHub 409 on concurrent writes | Acceptable for single-user; no additional locking |
| Groq over Anthropic for first draft | Groq `llama-3.3-70b-versatile` is faster and cheaper; easy to swap model later |
| Voyage AI for embeddings | Groq doesn't provide embeddings; Voyage `voyage-3` has strong retrieval quality |
| Form in-place (not modal) | More space for body textarea + side-by-side scaffold preview |
| Right sidebar for editor panels | Chapters live left; lore/AI live right — clear spatial separation |
