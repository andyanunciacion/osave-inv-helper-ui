import type { MetadataRoute } from "next";

// Makes the app installable to the home screen (AI_DOCS/main-file.md §9).
// Icons are rendered by src/app/icons/[file]/route.ts.
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Inventory Helper",
    short_name: "Inventory",
    description: "Delivery receipt scanning and inventory search for store staff",
    // Signed-in staff open straight to search; the store-session guard sends
    // anyone else to sign in at "/".
    start_url: "/search",
    scope: "/",
    display: "standalone",
    // The light-mode page background (layout.tsx's themeColor), so the launch
    // splash matches the first screen. The page's own themeColor meta takes
    // over once it loads, including in dark mode.
    background_color: "#f1f5f9",
    theme_color: "#f1f5f9",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
