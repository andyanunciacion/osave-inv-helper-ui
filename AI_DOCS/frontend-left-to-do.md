# Frontend — Left To Do

Reference doc for what's left to finish the frontend. Last updated
2026-10-07 (previous scans: 2026-09-25, 2026-09-16). Companion to
`AI_DOCS/main-file.md` (plan/domain rules) and `AI_DOCS/frontend-contract.md`
(backend API shape as the frontend expects it). Re-verify against current
code before trusting this — it's a point-in-time snapshot, not live state.

**Context at time of writing:** the frontend runs entirely against the real
backend (`NEXT_PUBLIC_API_URL`, default `http://localhost:4000`) — the
in-memory sample store and mock OCR were removed in #16/#19. Issue branches
(`<n>-<slug>`) merge into `develop`.

**In flight (2026-10-07):** #18 (generic slate/blue theme, `e399f54`) is
committed and pushed on `18-change-theme-to-generic-inventory-system` but not
yet merged into `develop` — open the PR.

Items 2–5 below were re-verified against code on 2026-10-07 and are all still
open; nothing merged since 2026-09-25 (#31, #32, #35, #37) closed any of them.
Item 1 is the follow-up list from the first full browser pass (2026-10-07).

---

## 1. Follow-ups from the end-to-end browser pass (do next)

Two browser passes ran 2026-10-07 against the real backend (Chrome, 500px
viewport — Chrome's minimum window width — dark mode). The first hit only
already-saved receipts (every confirm was `duplicate_delivery`); the Supabase
tables were then wiped (backup kept locally) and a second pass ran on fresh
data. DB now holds ITPH1844092 (14 items, two pages), ITPH1978604 (70 items,
3-page batch) and ITPH1966573 (34 items), store 245.

**Passed:** store session (trim, guard redirect, direct-URL load keeps
session); OCR → review (red blank-cell outlines, Qty × Unit/Box × price
mismatch flag, #31 inferred-cell styling + handwriting flag + printed-totals
mismatch warning, "Wrong store" alert disabling Confirm, #37 label → field
focus, 16px inputs); confirm → success summary; a later page appending to the
existing delivery (8 + 6 = 14 items); backend merging a repeated item code
(4272 ×2 → one row, qty 2, ₱168); multi-photo batch ("Page X of 3",
auto-advance after each confirm, reconcile recovering page 3's store code,
#27 batch summary "3 pages saved with 70 items"); #35 partial screen ("Retry
N failed" re-sends only the failed file, "Continue with N"); search (recent
uploads bar, empty state, group expand, virtualization — 16 of 71 rows in DOM,
exact-code auto-expand, quick date range / unified view, #32 "Searching…" +
"Couldn't load results" + Try again, #23 quantity edit + history, client-side
navigation).

Fixed during the pass: the #35 partial-batch screen's "Retry N failed" /
"Continue with N" buttons collapsed to 22px on mobile (`flex-1` in a
`flex-col` parent zeroes the flex-basis and overrides `h-11`) — now
`sm:flex-1` (verified on the real screen in the second pass).

### Bugs

- **The #21 merged-duplicate notice never shows after a clean save.** Since
  #27, a `success` result auto-advances (`upload-flow.tsx` `DraftReview`
  effect → `handleSaved`) straight to `BatchSummaryStep`, which ignores
  `mergedItems`; `MergedItemsNotice` is only rendered by `ResultStep`, which
  now only appears for `partial` results. Seen twice on fresh data: the
  Messenger page (7 rows → 6 saved, 4272 merged) and page 3 of the `13*`
  batch (21 rows → 19 saved) — no notice either time. The summary should
  list merged items per page (and flag the ones whose other fields
  disagreed, as #21 intended). Same screen also lost #21's "Receipt has more
  pages? Upload the next page" hint.
- ~~**A paused search shows "No deliveries found".**~~ **Fixed 2026-10-07.**
  TanStack Query pauses a query while the browser is offline, or a retry
  while the page is hidden, and `isLoading` is false while paused — so
  `toQueryStatus` fell through to `"idle"` and the results page rendered the
  empty state. `toQueryStatus` now takes `isPaused` and returns a new
  `"offline"` status; `ResultsStatus` shows "Waiting for a connection" (no
  Try again button — a manual refetch just rejoins the paused fetch). Unit +
  hook tests cover it (`onlineManager.setOnline(false)`); verified in the
  browser that the hidden-tab case shows the wait message and resumes to
  results once the page is visible.

- **A batch dead-ends when one page is already saved.** Confirming a page
  that returns `duplicate_delivery` shows "Nothing new to save" with only
  "Back to review" — that branch of `result-step.tsx` gets no
  `continueLabel`/`onContinue`, unlike the other non-success results. Cancel
  then calls `startOver()` (`upload-flow.tsx` `handleCancel`, nothing saved
  yet), discarding the remaining pages that were already OCR'd (billed).
  Repro: pick the three `13*.jfif` samples together, confirm page 1. Needs a
  "Skip to next page" / "Continue to next page" on the duplicate result.

### Smaller issues

**All done 2026-10-07** on branch `40-small-issuesadjustments` (hook tests
added; checked in the browser at 500px, light mode):

- Blank red-outlined cells **block Confirm** (`blankFieldCount` in
  `use-delivery-draft`), with a "N fields couldn't be read" alert.
- Rows with blank cells are **listed first** — sorted once when the draft is
  seeded, so rows don't jump while being filled in.
- **Batch progress**: "Reading 3 photos… 1 of 3 done" (`progress` in
  `use-ocr-capture`; photos are read in parallel, so it counts completions).
  Unit-tested; not seen live (the test tab was in the background).
- **Cancel asks first** (shadcn `alert-dialog`): "Discard this receipt?" /
  "Discard N unsaved pages?", noting confirmed pages stay saved.
- 44px touch targets: UOM `SelectItem` (also 16px text on mobile), "Add
  item" (default size), calendar day cells (`--cell-size` on the search
  calendar), recent-upload rows.
- Quantity panel: validation moved to a new `use-quantity-correction` hook;
  an unchanged value says "nothing changed" and sends nothing.
- Batch summary: "Page N ·" only for multi-photo uploads, "N items added".
- "Page N saved — N items" banner on the next page of a batch.
- Light mode: inputs/select triggers get a `bg-background` fill and
  `--input` is now `oklch(0.64 0.03 256)` (border 3.37:1 vs card, 3.08:1 vs
  fill). The mismatch badge and the dialog's Discard button use
  `text-red-700` / `dark:text-red-300`, since the destructive tint is ~4:1.
- Polish: `formatCurrency` groups thousands (₱9,576.72); a store code filled
  in from another page gets the dashed inferred outline; lists of ≤ 20 items
  render at full height (no nested scroll box); the recent-uploads bar shows
  skeleton rows while loading.

Found while verifying (also fixed): a later batch page can come back with a
**blank Transaction date** (14(1)/14(2).jfif did). Confirm sent it anyway and
the backend's 400 was shown as "Couldn't reach the server". A blank date now
blocks Confirm with "Transaction date is required".

Follow-ups from that pass, also done 2026-10-07:

- **Save errors say what actually happened.** `createDeliveryRequest` throws
  a `DeliveryRequestError` (status, backend `error` code, rejected field
  paths from the zod `issues`) when the server answers with an error;
  `upload/lib/save-error.ts` turns it into the message — a 400 names the
  rejected fields ("check Transaction date and 2 item rows"), a 5xx says the
  server had a problem, and only a request that never got an answer says
  "Couldn't reach the server". Not seen live (reaching a review costs an OCR
  call); unit-tested incl. parsing a real `Response`.
- **Outline-button borders** use `border-input` in light mode too (3.37:1,
  was 1.29:1) — covers the date pills and calendar trigger; the recent-upload
  rows switched to `border-input` as well.
- **Calendar Apply / Clear** are default size (44px on mobile).

### Backend (for `osave-inv-helper-server`)

- **Reconcile doesn't fill a blank Transaction date.** `/api/ocr/reconcile`
  recovered page 2/3's store code from page 1 of the `14*` batch but left
  their `delivery_date` blank, so staff had to type it on each page. Fill it
  from sibling pages with the same Inv. Tran. No., the same way as the store
  code (and flag it as inferred).

- **Printed totals partly missed:** for `17.jpg` the OCR returned only
  `total_value`; `total_box` and `total_items` came back blank although "Total
  Box: 8 / Total Item/s: 8" is clearly printed. With only the value sum to
  compare, a wrong Qty passes and the review still says "Matches the totals
  printed on the receipt."

### Still untested

- Rejected rows (an item code already saved on an earlier page of the same
  delivery) — no sample triggered one.
- #35 "Retry N failed" with a genuinely retryable failure (e.g. a transient
  `ocr_failed`) succeeding on retry.
- "Load more" (needs > 15 delivery groups; DB has 3), and a true ≤ 375px
  viewport. (Light mode was checked 2026-10-07 — see "Light mode (#18)
  contrast" above; the partial-batch and batch-summary screens weren't
  re-viewed in light, but use the same tokens as screens that were.)

## 2. Surface specific OCR errors on the capture screen

`toCaptureError` (`features/upload/hooks/use-ocr-capture.ts`) maps every
backend error except `store_mismatch` and the rate limits to the same generic
"Couldn't read that receipt. Try again." — so `invalid_file_type`,
`file_too_large` (> 10MB) and `ocr_failed` all look identical to staff, and
"try again" is wrong advice for the first two. This is what made the #28 JFIF
bug look like an unreadable photo. Small change: add kinds/messages for the
file-type and size errors.

Still open as of 2026-10-07, and #35 made it slightly worse: `isRetryable`
treats those errors as retryable (only `store_mismatch` is excluded), so the
partial-batch screen offers "Retry N failed" for a photo that is the wrong
file type or too large and will fail identically. When adding the new kinds,
mark them not retryable too. Confirmed in the browser 2026-10-07: a `.txt`
in a batch got a 400 from `/api/ocr` and the partial screen showed "Couldn't
read that receipt. Try again." with "Retry 1 failed".

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
2026-10-07). Needed:

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

Nothing exists yet — `public/` has only the Next.js starter SVGs (the company
logo was removed in #18), no manifest or service worker (re-checked
2026-10-07). Needed:

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
hardcoded to `"prototype-session"`, but deliveries saved on 2026-10-07 have
`uploaded_by: null` (seen in `/api/deliveries/recent`), so either the
frontend stopped sending it or the backend drops it — check which. If store staff get individual logins
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
  - #31: crossed-out/ticked Qty and UOM cells — the server fills them from
    the row's printed arithmetic and item history; the review screen marks
    inferred cells and handwriting rows, and compares rows live against the
    receipt's printed totals block (warns on mismatch, e.g. a missed row).
    `frontend-contract.md` documents `inferred` / `has_annotation` / `totals`.
  - #35: one failed photo no longer discards the whole batch. `useOcrCapture`
    pauses on a `partial` status; the `PartialBatchStep` screen lists each
    failed file with its reason and offers Retry failed (re-sends only the
    failed ones) / Continue with the read pages / Start over. Wrong-store
    photos are marked not retryable.
  - #37: visible labels on every review item field (tied via `useId`), and
    `SelectTrigger` sized like `Input` so the UOM select lines up.
- **Search flow (flow C):** grouped vs. unified (date-only) results,
  exact-delivery-code auto-expand, group pagination (15/page), item
  virtualization (`@tanstack/react-virtual`), shareable URL-driven results
  page. #23: per-item quantity edit + history panel in results.
  - #32: search hooks return a `status` (idle | loading | error | success)
    and `retry`; results page shows "Searching…" and a "Couldn't load
    results" alert with Try again instead of a false "No deliveries found".
- **Theme (#18, pending merge):** company logo/red removed; neutral slate
  with a muted blue accent, light/dark via `prefers-color-scheme`,
  "Inventory Helper" name. Also fixed the self-referencing `--font-sans`
  token that fell back to Times New Roman.
- Server state goes through TanStack Query (`useQuery`/`useMutation`)
  throughout — not hand-rolled fetch-in-`useEffect`.
