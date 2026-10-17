import { ImageResponse } from "next/og";

// The app logo as a PNG, for the home-screen/install icons that can't use
// src/app/icon.svg (AI_DOCS/main-file.md §9): the iPhone icon
// (src/app/apple-icon.tsx) and the manifest's Android/desktop icons
// (src/app/icons/[file]/route.ts). Same drawing as icon.svg: lucide "boxes",
// as on the home screen (src/app/page.tsx), on the primary blue.

const PRIMARY_BLUE = "#2863ab";
const LOGO_STROKE = "#f9fafb";

const BOXES_PATHS = [
  "M2.97 12.92A2 2 0 0 0 2 14.63v3.24a2 2 0 0 0 .97 1.71l3 1.8a2 2 0 0 0 2.06 0L12 19v-5.5l-5-3-4.03 2.42Z",
  "m7 16.5-4.74-2.85",
  "m7 16.5 5-3",
  "M7 16.5v5.17",
  "M12 13.5V19l3.97 2.38a2 2 0 0 0 2.06 0l3-1.8a2 2 0 0 0 .97-1.71v-3.24a2 2 0 0 0-.97-1.71L17 10.5l-5 3Z",
  "m17 16.5-5-3",
  "m17 16.5 4.74-2.85",
  "M17 16.5v5.17",
  "M7.97 4.42A2 2 0 0 0 7 6.13v4.37l5 3 5-3V6.13a2 2 0 0 0-.97-1.71l-3-1.8a2 2 0 0 0-2.06 0l-3 1.8Z",
  "M12 8 7.26 5.15",
  "m12 8 4.74-2.85",
  "M12 13.5V8",
];

export interface AppIconOptions {
  size: number;
  // The logo's width as a share of the icon. A maskable icon keeps it inside
  // the centre circle Android may crop to (80% of the icon across).
  logoScale: number;
  // Rounded corners with a transparent outside, like icon.svg. Off where the
  // platform shapes the icon itself (iOS, Android's maskable icon).
  rounded: boolean;
}

export function renderAppIcon({ size, logoScale, rounded }: AppIconOptions): ImageResponse {
  const logoSize = Math.round(size * logoScale);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: PRIMARY_BLUE,
          // 9/32, icon.svg's corner radius.
          borderRadius: rounded ? Math.round(size * 0.28) : 0,
        }}
      >
        <svg
          width={logoSize}
          height={logoSize}
          viewBox="0 0 24 24"
          fill="none"
          stroke={LOGO_STROKE}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {BOXES_PATHS.map((d) => (
            <path key={d} d={d} />
          ))}
        </svg>
      </div>
    ),
    { width: size, height: size },
  );
}
