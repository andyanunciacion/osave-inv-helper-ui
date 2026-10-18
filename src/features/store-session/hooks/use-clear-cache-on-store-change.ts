import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { useStoreSession } from "./use-store-session";

// Signing in to a different store drops the previous store's cached
// deliveries, in memory and in the saved offline copy (src/lib/query-persister.ts
// then saves the now-empty cache under the new store). Sign-out clears the
// cache itself (useSignOut). Re-entering the same store's passcode keeps it.
export function useClearCacheOnStoreChange(): void {
  const queryClient = useQueryClient();
  const { storeCode } = useStoreSession();
  const previous = useRef(storeCode);

  useEffect(() => {
    // null → a store: the first render after hydration, or a fresh sign-in
    // after sign-out, which already cleared everything.
    if (previous.current !== null && storeCode !== previous.current) queryClient.clear();
    previous.current = storeCode;
  }, [queryClient, storeCode]);
}
