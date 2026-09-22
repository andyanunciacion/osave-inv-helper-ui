"use client";

import { useEffect, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { useStoreSession } from "./use-store-session";

// Never changes after mount, so there's nothing to subscribe to — this
// store exists purely to get React's server/client snapshot reconciliation
// for `hydrated` below, the same mechanism useStoreSession uses for
// storeCode itself (see use-store-session.ts).
function subscribeNever() {
  return () => {};
}

function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribeNever,
    () => true,
    () => false,
  );
}

// AI_DOCS/main-file.md §6 flow A: every screen past the store-session step
// is scoped to a store_code. Screens that need one call this instead of
// useStoreSession directly, so a missing/cleared code redirects home
// instead of silently querying/uploading against an empty code.
//
// useStoreSession's getServerSnapshot always returns null (no localStorage
// on the server), so the very first client render after hydration renders
// that same null regardless of what's actually in localStorage — React
// only corrects it to the real value on a later render. Gating the redirect
// on `hydrated` (which resolves true/false through the same server/client
// snapshot mechanism) skips that transient render instead of bouncing to
// "/" on every hard navigation/refresh even when a valid code is stored.
export function useRequireStoreSession(): string | null {
  const { storeCode } = useStoreSession();
  const router = useRouter();
  const hydrated = useHydrated();

  useEffect(() => {
    if (hydrated && !storeCode) router.replace("/");
  }, [hydrated, storeCode, router]);

  return storeCode;
}
