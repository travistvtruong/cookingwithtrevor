import { ImageResponse } from "next/og";

// Home-screen icon for iPhones (they don't use SVG icons): the same "c" mark as app/icon.svg.
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#c2410c",
        }}
      >
        <svg width="120" height="120" viewBox="0 0 64 64">
          <path d="M43.5 22.5a14 14 0 1 0 0 19" fill="none" stroke="#fff" strokeWidth="8" strokeLinecap="round" />
        </svg>
      </div>
    ),
    size,
  );
}
