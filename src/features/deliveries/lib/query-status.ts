// The one bit of TanStack Query state search screens need, so hooks don't
// leak `UseQueryResult` into components. Without it, a slow or failed request
// rendered exactly like "no results" — staff could conclude an item never
// arrived when the request simply hadn't come back.
export type QueryStatus = "idle" | "loading" | "error" | "success";

export function toQueryStatus({
  data,
  isError,
  isLoading,
}: {
  data: unknown;
  isError: boolean;
  isLoading: boolean;
}): QueryStatus {
  // Results already on screen stay there if a background refetch fails.
  if (data !== undefined) return "success";
  if (isError) return "error";
  // `isLoading` is only true while a first fetch is actually in flight — a
  // disabled query (no filters yet) is "idle", not "loading".
  if (isLoading) return "loading";
  return "idle";
}
