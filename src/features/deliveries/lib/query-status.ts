// The one bit of TanStack Query state search screens need, so hooks don't
// leak `UseQueryResult` into components. Without it, a slow or failed request
// rendered exactly like "no results" — staff could conclude an item never
// arrived when the request simply hadn't come back.
export type QueryStatus = "idle" | "loading" | "offline" | "error" | "success";

export function toQueryStatus({
  data,
  isError,
  isLoading,
  isPaused,
  isRestoring = false,
}: {
  data: unknown;
  isError: boolean;
  isLoading: boolean;
  isPaused: boolean;
  // The saved offline copy is still being read back (src/lib/query-client.ts).
  // Queries don't start until it's in, and `isLoading` is false meanwhile.
  isRestoring?: boolean;
}): QueryStatus {
  // Results already on screen stay there if a background refetch fails.
  if (data !== undefined) return "success";
  if (isRestoring) return "loading";
  if (isError) return "error";
  // TanStack Query pauses a fetch while the browser is offline, and a retry
  // while the page is hidden. `isLoading` is false while paused, so without
  // this a search that never reached the server would fall through to
  // "idle" and render as "No deliveries found".
  if (isPaused) return "offline";
  // `isLoading` is only true while a first fetch is actually in flight — a
  // disabled query (no filters yet) is "idle", not "loading".
  if (isLoading) return "loading";
  return "idle";
}

// When the data on screen is the saved copy and couldn't be refreshed —
// offline, or the refresh failed — the time it was fetched, so the screen can
// say how old it is. null while it's current (or there's nothing on screen).
export function savedCopyTime({
  data,
  dataUpdatedAt,
  isError,
  isPaused,
  isOnline,
}: {
  data: unknown;
  dataUpdatedAt: number;
  isError: boolean;
  isPaused: boolean;
  isOnline: boolean;
}): number | null {
  if (data === undefined) return null;
  return !isOnline || isPaused || isError ? dataUpdatedAt : null;
}
