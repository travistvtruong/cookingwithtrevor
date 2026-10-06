import { ImageResponse } from "next/og";

// The card shown when a page without its own photo is shared (home, sections,
// about, posts without a photo). Posts with a photo use that photo instead.
export const alt = "cookingwithtrevor: recipes and food reviews";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// The site's heading font, Montserrat ExtraBold, fetched from Google Fonts when
// the image is built (only the letters used). If that fails, the image still
// renders in the default font.
async function headingFont(): Promise<ArrayBuffer | null> {
  try {
    const text = encodeURIComponent("Cook it.Eat it.Rate it.cookingwithtrevorRecipesFood reviewsGrocery lists");
    const css = await (await fetch(`https://fonts.googleapis.com/css2?family=Montserrat:wght@800&text=${text}`)).text();
    const url = css.match(/src: url\((.+?)\) format\('(?:opentype|truetype)'\)/)?.[1];
    if (!url) return null;
    const res = await fetch(url);
    return res.ok ? await res.arrayBuffer() : null;
  } catch {
    return null;
  }
}

export default async function OpengraphImage() {
  const font = await headingFont();
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          fontFamily: font ? "Montserrat" : undefined,
          background: "#1c1917",
          padding: 48,
          gap: 48,
        }}
      >
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            background: "#c2410c",
            borderRadius: 32,
            padding: 56,
            color: "#fff",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", fontSize: 96, fontWeight: 800, lineHeight: 1.02 }}>
            <span>Cook it.</span>
            <span>Eat it.</span>
            <span>Rate it.</span>
          </div>
          <div style={{ display: "flex", fontSize: 40, fontWeight: 700 }}>cookingwithtrevor</div>
        </div>
        <div
          style={{
            width: 300,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            gap: 24,
            color: "#fed7aa",
            fontSize: 40,
            fontWeight: 700,
          }}
        >
          <span>Recipes</span>
          <span>Food reviews</span>
          <span>Grocery lists</span>
        </div>
      </div>
    ),
    { ...size, fonts: font ? [{ name: "Montserrat", data: font, weight: 800, style: "normal" }] : undefined },
  );
}
