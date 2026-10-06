import { ImageResponse } from "next/og";

// PNG app icons for the web app manifest: the "c" mark from app/icon.svg.
// "maskable" leaves a wider margin, since Android crops icons into shapes.
const SIZES = { "192": 192, "512": 512, maskable: 512 } as const;

export const dynamicParams = false;

export function generateStaticParams() {
  return Object.keys(SIZES).map((size) => ({ size }));
}

export async function GET(_request: Request, { params }: RouteContext<"/icons/[size]">) {
  const { size } = await params;
  const px = SIZES[size as keyof typeof SIZES];
  const mark = Math.round(px * (size === "maskable" ? 0.5 : 0.66));
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#c2410c" }}>
        <svg width={mark} height={mark} viewBox="0 0 64 64">
          <path d="M43.5 22.5a14 14 0 1 0 0 19" fill="none" stroke="#fff" strokeWidth="8" strokeLinecap="round" />
        </svg>
      </div>
    ),
    { width: px, height: px },
  );
}
