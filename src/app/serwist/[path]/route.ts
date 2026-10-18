import { randomUUID } from "node:crypto";
import { createSerwistRoute } from "@serwist/turbopack";

// Serves /serwist/sw.js, the service worker built from src/lib/sw.ts with
// this build's precache list. Built once at build time.

// Every page, so any screen opens offline, not only ones this phone has
// visited. The HTML names this build's hashed chunks, so it gets a new
// revision on every build rather than a commit hash: a rebuild of the same
// commit with different env vars has different chunks.
const PAGES = ["/", "/search", "/search/results", "/upload", "/store-session/scan"];
const revision = randomUUID();

export const { dynamic, dynamicParams, revalidate, generateStaticParams, GET } = createSerwistRoute({
  swSrc: "src/lib/sw.ts",
  additionalPrecacheEntries: PAGES.map((url) => ({ url, revision })),
  // Serwist's default list plus woff2, so the Geist fonts (next/font,
  // self-hosted under /_next/static/media) work on an offline cold start.
  globPatterns: [
    ".next/static/**/*.{js,css,html,ico,apng,png,avif,jpg,jpeg,jfif,pjpeg,pjp,gif,svg,webp,json,webmanifest,woff2}",
    "public/**/*",
  ],
  useNativeEsbuild: true,
});
