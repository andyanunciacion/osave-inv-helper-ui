import { renderAppIcon } from "@/lib/app-icon";

// The iPhone home-screen icon when the app is added to the home screen
// (AI_DOCS/main-file.md §9). Same logo as icon.svg, but iOS needs a PNG and
// rounds the corners itself, so the background is a full square.
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return renderAppIcon({ size: size.width, logoScale: 0.6, rounded: false });
}
