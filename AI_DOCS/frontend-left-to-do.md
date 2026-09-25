# Frontend — Left To Do

Reference doc for what's left to finish the frontend. Last updated
2026-09-25 (previous full-codebase scan: 2026-09-16). Companion to
`AI_DOCS/main-file.md` (plan/domain rules) and `AI_DOCS/frontend-contract.md`
(backend API shape as the frontend expects it). Re-verify against current
code before trusting this — it's a point-in-time snapshot, not live state.

**Context at time of writing:** the frontend runs entirely against the real
backend (`NEXT_PUBLIC_API_URL`, default `http://localhost:4000`) — the
in-memory sample store and mock OCR were removed in #16/#19. Issue branches
(`<n>-<slug>`) merge into `develop`.

---

## 1. Full end-to-end browser pass (do next)

Only one flow has been click-tested against a running backend so far: a
single `.jfif` photo through capture → OCR → review (2026-09-25, while fixing
#28 — confirm was not pressed). Everything else has only been covered by
typecheck/lint/vitest. Walk through store session → upload → review → confirm
→ search at ~375px width, paying particular attention to:

- Review screen: item unit Select dropdown, Unit/Box field, red blank-cell
  outlines, Qty × Unit/Box × price mismatch flag, "Wrong store" alerts on
  capture and review.
- Multi-page "Upload another page" flow, and the multi-file batch upload +
  batch summary step (#27), including `/api/ocr/reconcile` recovering a store
  code hidden on one page.
- Result screen: rejected rows and the merged-duplicate-item notice (#21).
- `/search/results`: collapse/expand, "load more" (15 groups/page), virtualized
  lists (scroll behavior, dynamic row height via `measureElement`), item
  quantity edit + history panel (#23).
- Hard refresh / direct URL load on `/search` and `/upload` keeps the store
  session (#25).

## 2. Surface specific OCR errors on the capture screen

`toCaptureError` (`features/upload/hooks/use-ocr-capture.ts`) maps every
backend error except `store_mismatch` and the rate limits to the same generic
"Couldn't read that receipt. Try again." — so `invalid_file_type`,
`file_too_large` (> 10MB) and `ocr_failed` all look identical to staff, and
"try again" is wrong advice for the first two. This is what made the #28 JFIF
bug look like an unreadable photo. Small change: add kinds/messages for the
file-type and size errors.

## 3. Background upload queue UX (§8 of main-file.md)

`CaptureStep` (`features/upload/components/capture-step.tsx`) still shows a
full-screen **blocking** spinner ("Reading receipt…") while OCR runs — now
for every photo in a batch (#27), which makes the wait longer. §8 specifies
this should be non-blocking — a status badge/toast cycling
`pending → uploading → processing → done/failed`, with the rest of the app
usable meanwhile. Needed:

- A queue hook (e.g. `features/upload/hooks/use-upload-queue.ts`) tracking
  one or more in-flight captures independent of which screen is showing.
  `use-ocr-capture.ts` already tracks a batch with per-file errors — start
  from there rather than from scratch.
- A small persistent status UI (badge/toast), not a step that blocks
  navigation.
- Product decision still open: can a user navigate away from `/upload`
  mid-OCR and land on the review screen when it resolves? Can they start a
  second capture while one is still processing?

## 4. Offline queue / IndexedDB (§8)

`idb` is an installed dependency but **unused anywhere in `src/`** (re-checked
2026-09-25). Needed:

- IndexedDB-backed queue (e.g. `features/upload/lib/offline-queue.ts`)
  holding captured photos temporarily when offline, per §8 — treated as a
  *buffer*, not durable storage (iOS can evict it after extended inactivity —
  see §9).
- Wire `src/hooks/use-online-status.ts` (exists already) into the capture
  flow: hold-and-retry instead of failing outright when offline.
- Foreground/visibility-change retry trigger (§8/§9 — no Background Sync API
  on iOS Safari).
- Builds on §3's queue — do that first.

## 5. PWA (§9)

Nothing exists yet — `public/` has only the logo and Next.js starter SVGs, no
manifest or service worker (re-checked 2026-09-25). Needed:

- Web app manifest (name, icons, `display: standalone`, theme color). Check
  `node_modules/next/dist/docs/` for this Next.js version's `app/manifest.ts`
  convention before hand-writing `public/manifest.json`.
- Service worker — network-first for API calls, cache-first for static
  assets.
- Icons (multiple sizes).
- iOS "Add to Home Screen" nudge (no native install prompt on iOS Safari).

## 6. Realtime multi-user sync (§8, roadmap phase 4)

The only cross-client freshness comes from a user's own mutation invalidating
their own TanStack Query cache (`use-create-delivery.ts`,
`use-update-item-quantity.ts`) — another user's confirmed delivery or quantity
edit won't show up without a manual refetch. Needed once the backend supports
it:

- A realtime subscription per `store_code`.
- On event, invalidate the same query keys the mutations already invalidate
  (`["deliveries", storeCode]`) — additive to existing hooks, not a rework.

## 7. Optional — delete a confirmed delivery/item, edit other fields

Item **quantity** edit + change history is done (#23). Still not built:
deleting a delivery or item, and editing any field other than quantity
(`frontend-contract.md` §8 scopes the backend's update endpoint to quantity
only). main-file.md §12 lists this as an open question; its recommendation is
soft-delete + edit log. Not required for MVP.

## 8. Auth

`uploaded_by` has no real identity source — `frontend-contract.md` notes it's
hardcoded to `"prototype-session"`. If store staff get individual logins
eventually, that's a `store-session`-adjacent feature not yet designed. The
item history panel (#23) will show more useful "who changed this" info once
this exists.

---

## Already done (for context — don't re-scope these)

- **Store session (flow A):** manual entry + QR scan (`use-qr-scanner`,
  `@zxing/browser` fallback), localStorage persistence, route guard
  (`RequireStoreSession` / `use-require-store-session`) blocking `/search`
  and `/upload` without a store code. #25 fixed the guard redirecting to `/`
  on hard refresh/direct URL load (it now waits for hydration).
- **Backend wiring (#16):** sample store removed; `features/deliveries/lib/api.ts`
  and `features/upload/lib/api.ts` call the real backend through TanStack
  Query hooks.
- **Upload flow (flow B):** capture → real OCR (#19) → review/edit (editable
  Inv. Tran. No., Qty × Unit/Box × price mismatch flag, blank-cell
  highlighting, store-mismatch hard block, required receipt store code) →
  confirm → result. `/api/ocr` gets the session `store_code` and refuses a
  receipt for another store (409). Later pages of the same receipt append to
  the existing delivery.
  - #21: result screen notices items the backend merged because the same
    item code appeared twice in one submission, flagging merges where the
    other fields disagreed (possible misread code).
  - #27: pick several photos at once ("Choose photos", `multiple`); each is
    OCR'd, then `/api/ocr/reconcile` cross-checks store codes across the
    batch, with a batch summary step.
  - #28: `.jfif` photos (as saved by Messenger) are accepted. Chrome on
    Windows reports them as `application/octet-stream`, which the backend
    rejected as `invalid_file_type`; `features/upload/lib/normalize-image-file.ts`
    relabels JPEG-family extensions as `image/jpeg` before upload, and the
    file inputs accept `image/*,.jfif`.
- **Search flow (flow C):** grouped vs. unified (date-only) results,
  exact-delivery-code auto-expand, group pagination (15/page), item
  virtualization (`@tanstack/react-virtual`), shareable URL-driven results
  page. #23: per-item quantity edit + history panel in results.
- Server state goes through TanStack Query (`useQuery`/`useMutation`)
  throughout — not hand-rolled fetch-in-`useEffect`.
