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
}: {
  data: unknown;
  isError: boolean;
  isLoading: boolean;
  isPaused: boolean;
}): QueryStatus {
  // Results already on screen stay there if a background refetch fails.
  if (data !== undefined) return "success";
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
