"use client";

import { useClearCacheOnStoreChange } from "../hooks/use-clear-cache-on-store-change";

// Thin: renders nothing; mounted once in src/app/providers.tsx, inside the
// query client, so a store switch on any page drops the old store's data.
export function ClearCacheOnStoreChange() {
  useClearCacheOnStoreChange();
  return null;
}
