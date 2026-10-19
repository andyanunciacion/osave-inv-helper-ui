import { withSerwist } from "@serwist/turbopack";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Lets the dev server accept HMR/asset requests from a phone on the LAN
  // when testing over `npm run dev:https` (see AI_DOCS/main-file.md §9 —
  // camera access needs HTTPS, which is served on the LAN IP, not just
  // localhost).
  allowedDevOrigins: ["192.168.1.63"],
  // The service worker script must never be served from a cache, or phones
  // keep checking an old copy and never see a new deploy (Next's PWA guide).
  async headers() {
    return [
      {
        source: "/serwist/sw.js",
        headers: [{ key: "Cache-Control", value: "no-cache, no-store, must-revalidate" }],
      },
    ];
  },
};

// Keeps esbuild (which bundles the service worker) out of the server bundle.
export default withSerwist(nextConfig);
