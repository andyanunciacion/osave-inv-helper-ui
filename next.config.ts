import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Lets the dev server accept HMR/asset requests from a phone on the LAN
  // when testing over `npm run dev:https` (see AI_DOCS/main-file.md §9 —
  // camera access needs HTTPS, which is served on the LAN IP, not just
  // localhost).
  allowedDevOrigins: ["192.168.1.63"],
};

export default nextConfig;
