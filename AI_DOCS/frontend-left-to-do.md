# Frontend — Left To Do

Reference doc for what's left to finish the frontend, as of a full-codebase
scan on 2026-09-16. Companion to `AI_DOCS/main-file.md` (plan/domain rules)
and `AI_DOCS/frontend-contract.md` (backend API shape as the frontend
expects it). Re-verify against current code before trusting this — it's a
point-in-time snapshot, not live state.

**Context at time of writing:** branch `16-connect-backend-routes-to-frontend-routes`
was mid-flight, swapping the frontend off in-memory sample data
(`features/deliveries/lib/sample-store.ts`, `features/upload/lib/mock-ocr.ts`)
onto real HTTP calls against `NEXT_PUBLIC_API_URL`. The backend implementing
`frontend-contract.md`'s endpoints exists but was **not running** during this
scan, so nothing below was live-tested against it — typecheck, lint, and
`npm test` (59/59) were clean, but no browser walkthrough was done.

---

## 1. Wrap up current branch (small, do first)

- Commit the in-flight OCR swap: `use-ocr-capture.ts` (modified),
  `features/upload/lib/mock-ocr.ts` (deleted), `features/upload/lib/api.ts`
  (new, untracked as of this scan).
- Once the real backend is reachable, do a live pass through all three flows
  (store session → upload → review → search) end to end. This has never
  actually been click-tested against a running backend — only
  typecheck/lint/vitest and raw HTTP/SSR checks. Pay particular attention to:
  the Select dropdown for item unit, collapse/expand + "load more" on
  `/search/results`, and the virtualized lists (scroll behavior, dynamic row
  height via `measureElement`).

## 2. Background upload queue UX (§8 of main-file.md)

Currently `CaptureStep` (`features/upload/components/capture-step.tsx`) shows
a full-screen **blocking** spinner ("Reading receipt…") while OCR runs. §8
specifies this should be non-blocking — a status badge/toast cycling
`pending → uploading → processing → done/failed`, with the rest of the app
usable meanwhile. Needed:

- A queue hook (e.g. `features/upload/hooks/use-upload-queue.ts`) tracking
  one or more in-flight captures independent of which screen is showing.
- A small persistent status UI (badge/toast), not a step that blocks
  navigation.
- Product decision still open: can a user navigate away from `/upload`
  mid-OCR and land on the review screen when it resolves? Can they start a
  second capture while one is still processing?

## 3. Offline queue / IndexedDB (§8)

`idb` is an installed dependency but **unused anywhere in `src/`** (confirmed
by grep at time of writing). Needed:

- IndexedDB-backed queue (e.g. `features/upload/lib/offline-queue.ts`)
  holding captured photos temporarily when offline, per §8 — treated as a
  *buffer*, not durable storage (iOS can evict it after extended inactivity —
  see §9).
- Wire `src/hooks/use-online-status.ts` (exists already) into the capture
  flow: hold-and-retry instead of failing outright when offline.
- Foreground/visibility-change retry trigger (§8/§9 — no Background Sync API
  on iOS Safari).

## 4. PWA (§9)

Nothing exists yet — no `public/manifest.json`, no service worker, confirmed
by grep at time of writing. Needed:

- `public/manifest.json` (name, icons, `display: standalone`, theme color).
- Service worker — Workbox, network-first for API calls, cache-first for
  static assets.
- Icons (multiple sizes) and `<link rel="manifest">` wiring in
  `src/app/layout.tsx`.
- iOS "Add to Home Screen" nudge (no native install prompt on iOS Safari).

## 5. Realtime multi-user sync (§8, roadmap phase 4)

Right now the only cross-client freshness comes from a user's own mutation
invalidating their own TanStack Query cache
(`use-create-delivery.ts`'s `onSuccess`) — another user's confirmed delivery
won't show up without a manual refetch. Needed once the backend supports it:

- A Supabase Realtime (or backend-equivalent) subscription per `store_code`.
- On event, invalidate the same query keys `use-create-delivery.ts` already
  invalidates (`["deliveries", storeCode]`) — additive to existing hooks,
  not a rework.

## 6. Optional — edit/delete confirmed delivery/item

Flagged as an open question in main-file.md §12, not resolved either way.
Marked **optional / not required for MVP finish** as of this doc. Not built
at all today — no edit affordance exists on `SearchResults` /
`UnifiedResults` rows. If/when prioritized: soft-delete + edit log (per the
doc's own recommendation in §12), a new `features/deliveries` write hook,
and UI entry points from the search results view.

## 7. Auth

`uploaded_by` has no real identity source on the frontend today — `NewDeliveryInput`
doesn't carry it at all; identity, if any, is presumably a backend/auth-provider
concern outside this repo. If store staff get individual logins eventually,
that's a `store-session`-adjacent feature not yet designed.

---

## Already done (for context — don't re-scope these)

- **Store session (flow A):** manual entry + QR scan (`use-qr-scanner`,
  `@zxing/browser` fallback), localStorage persistence, route guard
  (`RequireStoreSession` / `use-require-store-session`) blocking `/search`
  and `/upload` without a store code.
- **Upload flow (flow B):** capture → OCR → review/edit (editable
  Inv. Tran. No., Qty × Unit/Box × price mismatch flag, blank-cell
  highlighting, store-mismatch hard block, required receipt store code) →
  confirm → result, wired to the real backend via `fetch`
  (`features/upload/lib/api.ts`, `features/deliveries/lib/api.ts`) — no more
  mock/sample data. One photographed page per pass; the backend appends later
  pages of the same receipt to the existing delivery. `/api/ocr` gets the
  session `store_code` and a receipt for another store is refused (409).
- **Not yet click-tested in a browser** against a running backend: the new
  Unit/Box field, red blank-cell outlines, the "Wrong store" alerts on capture
  and review, and the multi-page "Upload another page" flow.
- **Search flow (flow C):** grouped vs. unified (date-only) results,
  exact-delivery-code auto-expand, group pagination (15/page), item
  virtualization (`@tanstack/react-virtual`), shareable URL-driven results
  page.
- Server state correctly goes through TanStack Query (`useQuery`/
  `useMutation`) throughout — not hand-rolled fetch-in-`useEffect`.
