import { onlineManager, QueryClient, type Query } from "@tanstack/react-query";
import type { PersistQueryClientOptions } from "@tanstack/react-query-persist-client";
import { createQueryPersister } from "./query-persister";

// Offline mode is read-only (frontend-left-to-do.md §4): staff see the
// deliveries last fetched online, for up to a week.
export const SAVED_DATA_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

// Bump when a saved query's data shape changes, so phones drop the old copy
// instead of rendering it with the new code.
const SAVED_DATA_VERSION = "1";

export function makeQueryClient(): QueryClient {
  // TanStack Query assumes it's online until the browser says otherwise, so an
  // app opened in airplane mode would try every request (and wait out the
  // retries) before showing the saved copy. `window`, not `navigator`: Node
  // has a `navigator` too, without `onLine`.
  if (typeof window !== "undefined") onlineManager.setOnline(window.navigator.onLine);

  return new QueryClient({
    defaultOptions: {
      // A query must stay in memory as long as it may be saved, or it drops
      // out of the saved copy minutes after its screen closes.
      queries: { gcTime: SAVED_DATA_MAX_AGE_MS },
      // Nothing is sent while offline: a save fails straight away with its
      // own "couldn't reach the server" message instead of pausing and going
      // out by itself once the connection returns. Buttons are disabled
      // offline anyway; this covers a connection lost mid-tap.
      mutations: { networkMode: "always" },
    },
  });
}

// Only successful delivery reads younger than a week are saved. The saved
// copy's own timestamp resets on every write, so the age has to be checked
// per query.
function shouldSaveQuery(query: Query): boolean {
  return (
    query.queryKey[0] === "deliveries" &&
    query.state.status === "success" &&
    Date.now() - query.state.dataUpdatedAt < SAVED_DATA_MAX_AGE_MS
  );
}

export function makePersistOptions(): Omit<PersistQueryClientOptions, "queryClient"> {
  return {
    persister: createQueryPersister(),
    maxAge: SAVED_DATA_MAX_AGE_MS,
    buster: SAVED_DATA_VERSION,
    dehydrateOptions: { shouldDehydrateQuery: shouldSaveQuery },
  };
}
