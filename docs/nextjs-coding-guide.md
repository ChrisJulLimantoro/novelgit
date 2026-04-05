# Next.js 16 Coding Guide — NovelGit

**Read this before writing any new components or pages.**

This project runs **Next.js 16 (App Router) with React 19**. Many patterns from older Next.js versions will cause silent bugs, hydration errors, or warnings. This guide documents what actually changed and the rules to follow.

---

## 1. Server vs Client Components — the default that trips everyone up

### What changed

In Next.js 16 App Router **every file is a Server Component by default** unless it contains `"use client"` at the top.

| What you want | How to get it |
|---|---|
| Runs only on server, zero JS shipped to client | Nothing — it's the default |
| Needs `useState`, `useEffect`, browser APIs, event handlers | `"use client"` at top of file |
| Shared between both (pure utilities, types) | Regular modules — no directive |

### The rendering model on first load

1. **Server Components** → rendered on the server into the **RSC Payload** (compact binary).
2. **Client Components** → also _pre-rendered_ on the server (SSR) _and_ bundled for the client.
3. Browser receives HTML (fast paint) + RSC Payload + JS bundle.
4. React **hydrates** Client Components: it attaches event handlers by replaying the render and matching it against the existing DOM.

**Hydration is the key risk.** If the server render and the client render produce different HTML for a Client Component, React 19 throws `Hydration failed`. See §2.

### Rules

- Keep `"use client"` as deep in the tree as possible. Mark only the interactive leaf, not the whole page/layout.
- Never `import 'server-only'` code from a Client Component.
- Context providers (`createContext`) must be Client Components. Wrap them around `{children}` as tightly as possible — see `components/theme-provider.tsx`.

---

## 2. Hydration — the #1 source of errors

### What hydration means

React renders the Client Component **again on the client** and diffs its output against the server-generated HTML. Any mismatch → `Hydration failed`.

### Root causes and fixes

#### 2a. `typeof window !== 'undefined'` checks at render time

```tsx
// ❌ BAD — renders null on server, real content on client
export function Foo() {
  if (typeof window === "undefined") return null;
  return <div>{window.innerWidth}</div>;
}

// ✅ GOOD — both renders return null; content appears after mount
export function Foo() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return <div>{window.innerWidth}</div>;
}
```

#### 2b. `Date.now()` / `Math.random()` / `new Date()` at render time

These produce different values on the server vs. the client.

```tsx
// ❌ BAD — different timestamp on server and client
export function Timestamp() {
  return <span>{Date.now()}</span>;
}

// ✅ GOOD — computed once, after hydration
export function Timestamp() {
  const [ts, setTs] = useState<number | null>(null);
  useEffect(() => setTs(Date.now()), []);
  return <span>{ts ?? "..."}</span>;
}
```

**Exception**: in a **Server Component**, `new Date()` is fine because Server Components never re-render on the client. See `app/(editor)/edit/.../page.tsx` which sets `fetchedAt = new Date().toISOString()` safely as a Server Component.

#### 2c. Locale-sensitive formatting (`toLocaleString`, `Intl`, `toLocaleDateString`)

The Node.js server locale differs from the user's browser locale.

```tsx
// ❌ BAD — "12/31/2024, 6:00:00 PM" on server, "31.12.2024, 18:00:00" on client
const formatted = new Date(isoDate).toLocaleString();

// ✅ GOOD — only runs on client, after mount
const [formatted, setFormatted] = useState("");
useEffect(() => {
  setFormatted(new Date(isoDate).toLocaleString());
}, [isoDate]);
```

#### 2d. Third-party libraries that use browser APIs internally

Libraries like `@nivo/calendar` (used in this project) use `ResizeObserver` / `getBoundingClientRect` internally. On the server these return 0 / throw. On the client they return real values → mismatch.

**Fix A — mounted guard (used in this project):**

```tsx
"use client";
const [mounted, setMounted] = useState(false);
useEffect(() => setMounted(true), []);
if (!mounted) return <div style={{ height: 200 }} aria-hidden />;
return <ActualChart ... />;
```

**Fix B — dynamic import with `ssr: false`:**

```tsx
import dynamic from "next/dynamic";
const Chart = dynamic(() => import("./heavy-chart"), { ssr: false });
```

> Use `ssr: false` only inside **Client Components** (`"use client"`). Moving it into a Server Component loses code-splitting. See Next.js 16 lazy-loading guide.

#### 2e. `suppressHydrationWarning`

Add this only to elements whose content is _intentionally_ different between server and client (e.g. the `<html>` tag whose class is toggled by a theme script before React loads). It suppresses the warning for **that single element only** — it does not suppress React 19's "Encountered a script tag" warning.

---

## 3. The `<script>` tag warning (React 19)

### What it says

```
Encountered a script tag while rendering React component.
Scripts inside React components are never executed when rendering on the client.
```

### Why it fires

React 19 has first-class support for hoisting `<link>`, `<meta>`, `<title>`, and external async `<script src="..." async>` tags. **Inline `<script>` elements inside Client Components** get this warning because React won't re-execute them on the client — they only ran when the browser parsed the SSR HTML.

### Fix: render the init script from a Server Component

Server Components are not reconciled by React on the client. A `<script>` element inside a Server Component is just part of the HTML output — React's `createInstance` is never called for it on the client, so the warning never fires.

```tsx
// app/layout.tsx — Server Component ✅
const themeScript = `try{...}catch(e){}`;

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        {children}
      </body>
    </html>
  );
}
```

**Never put an inline `<script>` inside a `"use client"` component.** If you need external scripts, use `next/script` — it handles deduplication and hoisting automatically.

---

## 4. `params` and `searchParams` are Promises in Next.js 16

This is a **breaking change** from Next.js 13–14.

```tsx
// ❌ OLD — sync access, crashes in Next.js 16
export default function Page({ params }: { params: { id: string } }) {
  const { id } = params; // TypeError
}

// ✅ NEW — async page components, await params
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
}
```

Same for `searchParams`:

```tsx
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
}
```

---

## 5. Caching with `use cache` (Next.js 16)

Next.js 16 ships a new `use cache` directive. When `cacheComponents: true` is set in `next.config.ts`, it replaces the old `fetch` caching model.

```ts
// lib/data.ts
export async function getUser(id: string) {
  "use cache";
  cacheLife("hours");
  return db.query("SELECT * FROM users WHERE id = ?", [id]);
}
```

```tsx
// app/page.tsx — cache the whole page
export default async function Page() {
  "use cache";
  cacheLife("hours");
  const users = await getUsers();
  return <UserList users={users} />;
}
```

This project does **not** currently enable `cacheComponents`. All data fetching goes through GitHub's API via `lib/github-content.ts`. If caching is added, use `"use cache"` + `cacheLife` instead of manual `fetch` cache options.

---

## 6. Context providers and the theme pattern

React context is not available in Server Components. The pattern for global providers:

1. Create a **Client Component** with `createContext` + `useState`/`useEffect`.
2. Import it into the **Server Component layout** — the layout itself stays a Server Component.
3. The provider wraps `{children}`, not the entire `<html>`.

Example from this project (`components/theme-provider.tsx`):

```tsx
"use client";
// createContext, useState, useEffect — no <script> injection
export function ThemeProvider({ children, defaultTheme = "system" }) { ... }
export function useTheme() { return useContext(ThemeCtx); }
```

```tsx
// app/layout.tsx — Server Component
import { ThemeProvider } from "@/components/theme-provider";
// init script is here as a raw <script> in the Server Component
```

---

## 7. Quick reference — "which directive do I need?"

| Situation | Directive |
|---|---|
| Component uses `useState`, `useEffect`, `useRef`, `useContext` | `"use client"` |
| Component attaches event handlers (`onClick`, `onChange`, etc.) | `"use client"` |
| Component reads `window`, `document`, `localStorage` | `"use client"` |
| Function uses `cookies()`, `headers()`, DB calls, `process.env.*` secrets | Server Component (no directive) — or `"use server"` for Server Functions |
| Library that doesn't have `"use client"` but uses browser APIs | Wrap it: `"use client"; export { Lib } from 'the-lib'` |
| Data changes at request time, must not be cached | Server Component + no `"use cache"` directive |

---

## 8. Common mistake checklist before opening a PR

- [ ] No `new Date()` / `Date.now()` / `Math.random()` at the top level of a Client Component render — use `useEffect`.
- [ ] No `toLocaleString()` / `Intl.*` at the top level of a Client Component render — use `useEffect`.
- [ ] No raw `<script>` tags inside `"use client"` components — move to a Server Component or use `next/script`.
- [ ] Any third-party chart/widget that measures the DOM is guarded with a `mounted` state or `ssr: false`.
- [ ] `params` / `searchParams` are awaited (they are Promises in Next.js 16).
- [ ] `suppressHydrationWarning` is only on `<html>` (or another element that legitimately differs between server and client) — not sprinkled everywhere to silence bugs.
