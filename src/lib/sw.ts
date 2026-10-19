/// <reference lib="webworker" />
// The service worker (AI_DOCS/main-file.md §9), bundled by
// src/app/serwist/[path]/route.ts and registered in src/app/providers.tsx.
// It caches the app itself so it opens offline. Backend calls are never
// cached here: offline data comes from the saved query cache instead
// (frontend-left-to-do.md §4). Cache Storage keys requests by URL only, not
// by the store-code header, so a cached search could show under another
// store.
import { defaultCache } from "@serwist/turbopack/worker";
import { NetworkOnly, Serwist, type PrecacheEntry, type SerwistGlobalConfig } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  // Every /_next/static file plus each page's HTML, from the same build.
  precacheEntries: self.__SW_MANIFEST,
  precacheOptions: {
    // /search/results?q=… opens the one precached results page, which reads
    // its query from the URL itself.
    ignoreURLParametersMatching: [/.*/],
    cleanupOutdatedCaches: true,
  },
  // A new version waits until staff tap Reload on the "update ready" banner
  // (features/app-update), so a deploy never swaps code mid-review.
  skipWaiting: false,
  // The first install controls the open page right away, so it works
  // offline without a reload.
  clientsClaim: true,
  runtimeCaching: [
    // The backend is on another origin: straight to the network.
    { matcher: ({ sameOrigin }) => !sameOrigin, handler: new NetworkOnly() },
    ...defaultCache,
  ],
});

serwist.addEventListeners();
