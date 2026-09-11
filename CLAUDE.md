@AGENTS.md

# Project rules — osave-inv-helper-ui (frontend)

Frontend for the system described in `AI_DOCS/main-file.md`. Read that doc for domain rules (delivery/item uniqueness, store scoping, OCR flow) — this file is about code structure only.

## Folder structure (feature-based)

```
src/
  app/                 Next.js routes only — thin: compose feature components, no business logic
  features/
    store-session/     §6 flow A — store_code session
    upload/             §6 flow B — capture, OCR review, background upload queue
    search/              §6 flow C — search/filter deliveries
    deliveries/          shared delivery/item data access used by upload + search
    <feature>/
      hooks/            state + logic for this feature
      components/       thin UI for this feature
  components/ui/        shadcn primitives only (generated via `npx shadcn add ...`) — do not hand-edit business logic in here
  hooks/                 hooks shared across 2+ features (e.g. use-online-status)
  lib/                   framework-agnostic clients/setup: supabase client, OCR proxy client, idb setup, query client
  types/                  shared TypeScript types — keep `schema.ts` in sync with AI_DOCS/main-file.md §4
```

A new feature gets its own `src/features/<name>/{hooks,components}` folder. Don't add a top-level `src/features/<name>/index.ts` barrel unless a real cross-feature import needs it.

## Logic lives in hooks — components stay thin

This is the core rule. It exists so business logic (session rules, OCR review validation, duplicate handling, search filters) is testable and reusable without a DOM, and so components stay easy to read.

- A component may hold **only**: local UI state (open/closed, form draft values, focus), JSX, and calls into hooks.
- Anything else — data fetching, localStorage/IndexedDB access, validation, derived/computed values, side effects, business rules from `AI_DOCS/main-file.md` — belongs in a hook.
- If a component needs `useEffect` for anything beyond a DOM-only concern (focus, scroll, subscribing to a browser event with no business meaning), that logic almost certainly belongs in a hook instead.
- One hook, one responsibility. Prefer `use-store-session.ts` + `use-upload-queue.ts` over one large `use-app-state.ts`.
- A hook returns data and actions, never JSX.

Reference example: `src/features/store-session/hooks/use-store-session.ts` (logic: localStorage read/write, normalization, `useSyncExternalStore` for the SSR/client snapshot) + `src/features/store-session/components/store-code-form.tsx` (thin: renders based on hook state, only local `draft` input state of its own).

**Rule of thumb:** if you can't unit-test the logic without rendering the component, it's in the wrong place.

## Naming conventions

- Files: kebab-case (`use-store-session.ts`, `store-code-form.tsx`).
- Hooks: `use-<noun-or-verb>`, one per file, file name matches the exported hook name.
- Components: PascalCase export, one primary component per file.
- Types: `PascalCase`, colocate feature-specific types in that feature's folder (e.g. `features/upload/types.ts`) — only cross-feature/domain types go in `src/types/`.

## Server state

Use **TanStack Query** for anything backed by Supabase (queries, mutations, realtime-triggered invalidation) — don't hand-roll `useState`/`useEffect` data fetching. `QueryClientProvider` is set up in `src/app/providers.tsx`. A feature's data hooks (e.g. `use-delivery-search`) wrap `useQuery`/`useMutation` and expose a small, feature-specific return shape — don't leak raw TanStack Query objects (`UseQueryResult`, etc.) into components.

## Testing

Hooks that contain non-trivial logic (branching, validation, anything beyond a passthrough) get a Vitest + React Testing Library test colocated as `<hook-name>.test.ts` next to the hook, using `renderHook`. Pure UI components generally don't need their own tests unless they contain real conditional rendering logic worth locking down.

Run with `npm test` (single run) or `npm run test:watch`.

## Mobile-first

Primary users are store staff on a phone, one-handed, often mid-task with a receipt in the other hand — see AI_DOCS/main-file.md §1/§9 (PWA, camera capture, iOS Safari). Design and build for that first; desktop/tablet is a widened view of the same UI, not a separate design.

- **Tailwind classes are written mobile-first**: unprefixed classes are the phone layout. Add `sm:`/`md:`/`lg:` only to *change* something for a wider viewport (e.g. a form that stacks on phone and goes inline at `sm:`) — never write the desktop layout first and try to cram it down with prefixes.
- **Touch targets ≥ 44px.** `Button` (`default`/`lg`/`icon`/`icon-lg`) and `Input` already default to ~44px tall on mobile and step down at `md:` for pointer devices — use those defaults for primary actions. `xs`/`sm` button sizes are for dense, secondary contexts only, not primary tap targets.
- **Inputs must render at `text-base` (16px) or larger** on mobile — anything smaller triggers iOS Safari's auto-zoom-on-focus. The `Input` primitive already does this (`text-base`, `md:text-sm`); don't override it smaller.
- **No hover-only affordances.** Touch has no hover state — anything that matters must also work via tap/focus (`active:`, `focus-visible:`), not rely on `hover:` alone.
- **Avoid bare `100vh`/`h-screen` for full-height mobile layouts** — mobile browser chrome (address bar) resizes the viewport and causes jumpy layouts. Prefer height driven by flex/content (as in `src/app/layout.tsx`'s `html`/`body`), or `100dvh` when a hard full-screen is required (e.g. a future full-screen camera capture view).
- **Safe-area insets are already applied** on `body` (`globals.css`) via `env(safe-area-inset-*)`, and `viewport-fit=cover` is set in `src/app/layout.tsx`'s `viewport` export, for when this runs as an installed PWA behind a notch/home-indicator.
- **Design/test at ~375px width first** (iPhone SE/mini-class), then check the layout still holds at typical tablet/desktop widths — not the other way around.

## Other conventions

- Path alias `@/*` → `src/*`.
- shadcn/ui components live in `src/components/ui` and are added via `npx shadcn add <component>` — don't hand-write primitives that shadcn already provides.
- Keep `src/app/*/page.tsx` files thin: import and compose feature components, no inline business logic.
