import type { RecentUpload } from "../types";

// Placeholder data source for the quick-select bar. No `deliveries` query
// hook exists yet (features/deliveries is unimplemented) — swap this body
// for a `useQuery` against Supabase, store-scoped, ordered by created_at
// desc, once that's wired up. Return shape stays the same either way.
const PLACEHOLDER_RECENT_UPLOADS: RecentUpload[] = [
  { deliveryCode: "INV-88213", deliveryDate: "2026-09-10", itemCount: 14 },
  { deliveryCode: "INV-88190", deliveryDate: "2026-09-09", itemCount: 6 },
  { deliveryCode: "INV-88144", deliveryDate: "2026-09-07", itemCount: 22 },
];

export interface UseRecentUploadsResult {
  uploads: RecentUpload[];
}

export function useRecentUploads(): UseRecentUploadsResult {
  return { uploads: PLACEHOLDER_RECENT_UPLOADS };
}
