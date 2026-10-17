import { renderAppIcon, type AppIconOptions } from "@/lib/app-icon";

// The install icons the web app manifest (src/app/manifest.ts) lists.
// Android/Chrome want 192px and 512px PNGs; the maskable one is a full
// square with the logo kept inside the circle Android may crop it to.
// Rendered once at build time.
const ICON_FILES = {
  "icon-192.png": { size: 192, logoScale: 0.6, rounded: true },
  "icon-512.png": { size: 512, logoScale: 0.6, rounded: true },
  "icon-maskable-512.png": { size: 512, logoScale: 0.5, rounded: false },
} satisfies Record<string, AppIconOptions>;

type IconFile = keyof typeof ICON_FILES;

export const dynamicParams = false;

export function generateStaticParams() {
  return Object.keys(ICON_FILES).map((file) => ({ file }));
}

export async function GET(_request: Request, ctx: RouteContext<"/icons/[file]">) {
  const { file } = await ctx.params;
  return renderAppIcon(ICON_FILES[file as IconFile]);
}
