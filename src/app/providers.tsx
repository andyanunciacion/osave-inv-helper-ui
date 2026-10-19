"use client";

import { SerwistProvider } from "@serwist/turbopack/react";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { useState } from "react";
import { ClearCacheOnStoreChange } from "@/features/store-session/components/clear-cache-on-store-change";
import { makePersistOptions, makeQueryClient } from "@/lib/query-client";
// Catches Chrome's install prompt on whichever page loads first, not just
// the pages that show the install tip.
import "@/features/install/lib/install-prompt-store";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(makeQueryClient);
  const [persistOptions] = useState(makePersistOptions);

  return (
    // The service worker (src/lib/sw.ts) is off in dev, where it would cache
    // over hot reloads. reloadOnOnline is off because Serwist's default
    // reloads the page when the connection returns, which would throw away a
    // half-filled review. Pages are all precached, so caching each
    // navigation is off too.
    <SerwistProvider
      swUrl="/serwist/sw.js"
      disable={process.env.NODE_ENV === "development"}
      reloadOnOnline={false}
      cacheOnNavigation={false}
    >
      {/* Saves delivery reads in IndexedDB so they open offline (src/lib/query-client.ts). */}
      <PersistQueryClientProvider client={queryClient} persistOptions={persistOptions}>
        <ClearCacheOnStoreChange />
        {children}
      </PersistQueryClientProvider>
    </SerwistProvider>
  );
}
