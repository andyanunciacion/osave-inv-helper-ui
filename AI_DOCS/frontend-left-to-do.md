# Frontend — Left To Do

Reference doc for what's left to finish the frontend. Last updated
2026-10-08 (previous scans: 2026-10-07, 2026-09-25, 2026-09-16). Companion to
`AI_DOCS/main-file.md` (plan/domain rules) and `AI_DOCS/frontend-contract.md`
(backend API shape as the frontend expects it). Re-verify against current
code before trusting this — it's a point-in-time snapshot, not live state.

**Context at time of writing:** the frontend runs entirely against the real
backend (`NEXT_PUBLIC_API_URL`, default `http://localhost:4000`) — the
in-memory sample store and mock OCR were removed in #16/#19. Issue branches
(`<n>-<slug>`) merge into `develop`.

**In flight (2026-10-08):** #42 (merged-items notice after a clean save,
`93154c5`) is committed on `42-merge-duplicate-notice-never-shows-after-a-clean-save`
but not pushed. The remote branch was created from an older commit, so a
plain push fast-forwards it. Then open the PR into `develop`. #18 and #40 are
merged (PRs #39, #41).

**Release dependency:** the server's `#15` (crossed-out Qty/UOM,
`inferred` / `has_annotation` / `totals` on `/api/ocr`) is committed in
`osave-inv-helper-server` but **not pushed or merged**, and this repo's #31
(already on `develop`) depends on it. Ship them together. See the server's
`AI_DOCS/backend-left-to-do.md` §1.

Items 2–5 below were re-verified against code on 2026-10-07 and were all still
open then; nothing merged since 2026-09-25 (#31, #32, #35, #37) closed any of
them. Item 2 has since been done (#46, 2026-10-08).
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

- ~~**The #21 merged-duplicate notice never shows after a clean save.**~~
  **Fixed 2026-10-07.** Since #27 a `success` result auto-advanced straight
  to `BatchSummaryStep`, which ignored `mergedItems` (the backend sends them
  with `status: "success"`; only `ResultStep`, now reached only for
  `partial`, rendered them). `MergedItemsNotice` moved to its own file and
  `BatchSummaryStep` renders it under each page that had merges (amber
  "need a check" for `fieldsDisagreed`); the next page's banner reads "Page
  N saved — 6 items · 1 item combined" (`savedPageNotice` in
  `upload/lib/merged-items.ts`, unit-tested). The summary shows the
  "Receipt has more pages?" hint again. Verified live: the two merge pages
  were deleted from the DB and re-uploaded one at a time — the Messenger page
  showed "1 item combined — 4272", `13(2).jfif` "2 items combined — 4272,
  4295"; DB matches its earlier state (14 / 70 items). The next-page banner
  (a merge on a non-final batch page) and an amber `fieldsDisagreed` merge
  weren't triggered.
  `frontend-contract.md` §2 synced with the server's copy (`mergedItems`,
  merge-vs-reject rules).
- **Follow-up: warn about repeated item codes before Confirm.** A merge is
  only reported after saving, and only quantity can be edited afterwards — so
  a misread code (`fieldsDisagreed`) can't really be fixed. `useDeliveryDraft`
  could group rows by the backend's key (`item_code` or
  `name:<lowercased item_name>`) and the review could show a non-blocking
  "These rows will be combined" alert, amber when the other fields differ.
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

- ~~**A batch dead-ends when one page is already saved.**~~ **Fixed
  2026-10-08 (#44), unit-tested and checked in the browser at 500px with
  the three `13*.jfif` samples (all three skipped as already saved).** The
  `duplicate_delivery` and `store_mismatch` result screens now offer "Skip
  to next page" / "Skip and finish" next to "Back to review" ("Upload
  another" for a single photo). Saved/skipped bookkeeping moved out of
  `upload-flow.tsx` into `use-upload-batch`. The summary lists skipped pages
  and reads "Nothing new saved" when every page was skipped. Not seen live:
  skipping a page between two saved ones, and the `store_mismatch` result
  (the client-side check usually blocks Confirm first).

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

These are tracked in the server's `AI_DOCS/backend-left-to-do.md`, last
scanned 2026-10-08. The ones that touch this repo:

- **Reconcile doesn't fill a blank Transaction date** (server §3). Seen on
  the `14*` batch: staff had to type the date on pages 2/3. The proposed
  `delivery_date_inferred` flag would need the dashed inferred outline here,
  like the store code.
- **Reconcile doesn't cross-check `delivery_code`** (server §3). A page with
  a misread Inv. Tran. No. saves as a second, bogus delivery. Needs a
  contract decision (flag only, or also fill) and a review-screen warning.
- **Printed totals partly missed** for `17.jpg` (server §3): only
  `total_value` came back, so a wrong Qty still shows "Matches the totals
  printed on the receipt."
- **Search and recent uploads silently stop at 1,000 item rows** (server
  §2). Two full-size deliveries in a date range would drop rows and give a
  wrong total. The fix is server-only, but "Load more" and the unified view
  should be re-checked afterwards.
- **A failed quantity save can still change the quantity** (server §2): the
  PATCH updates first and writes history second, so a 500 from the history
  insert leaves the new value saved but unaudited. `use-update-item-quantity`
  shows it as failed. Refetching on error (invalidate on `onSettled`, not
  only `onSuccess`) would at least show the real value.
- **The two `frontend-contract.md` copies have drifted** (server §6). This
  copy is missing the `/api/ocr/reconcile` section,
  `DraftHeader.printout_datetime`, the full `totals` rules and all of §8
  (quantity PATCH). The server's copy is missing this repo's newer §2
  wording. Merge them once and copy the result to both repos.

### Still untested

- Rejected rows (an item code already saved on an earlier page of the same
  delivery) — no sample triggered one.
- #35 "Retry N failed" with a genuinely retryable failure (e.g. a transient
  `ocr_failed`) succeeding on retry.
- "Load more" (needs > 15 delivery groups; DB has 3), and a true ≤ 375px
  viewport. (Light mode was checked 2026-10-07 — see "Light mode (#18)
  contrast" above; the partial-batch and batch-summary screens weren't
  re-viewed in light, but use the same tokens as screens that were.)

## 2. ~~Surface specific OCR errors on the capture screen~~ — done (#46)

Done 2026-10-08. `features/upload/lib/capture-error.ts` gives each cause its
own title, message and `retryable` flag: not an image / over 10MB (both now
also caught in the browser before sending, so they never use up the OCR rate
limit), no connection, wrong store, per-minute vs daily limit, and an
unreadable photo (the raw Vision error text from `ocr_failed` is no longer
shown). Not retried by "Retry N failed": wrong file type, too large, wrong
store, daily limit. Browser-checked with a `.txt` ("Not a photo"). Not seen
live: the partial-batch screen with a non-retryable row (needs one billed OCR
call for the good photo), and an over-10MB photo (the browser tool can't
upload one). Both are unit-tested.

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

`uploaded_by` has no real identity source. Deliveries are saved with
`uploaded_by: null` because **the frontend never sends it** (checked
2026-10-08: no reference in `src/` outside `types/schema.ts` and test
fixtures). The server stores the field when it's present, and
`frontend-contract.md`'s "hardcoded to `prototype-session`" line is stale.
The server's read/edit routes also aren't scoped to a store yet (server
§4). If store staff get individual logins
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
- **Theme (#18, merged via PR #39):** company logo/red removed; neutral slate
  with a muted blue accent, light/dark via `prefers-color-scheme`,
  "Inventory Helper" name. Also fixed the self-referencing `--font-sans`
  token that fell back to Times New Roman.
- Server state goes through TanStack Query (`useQuery`/`useMutation`)
  throughout — not hand-rolled fetch-in-`useEffect`.
