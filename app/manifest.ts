import type { MetadataRoute } from "next";

// Lets phones install the site like an app (R11); grocery lists then work
// offline through public/sw.js.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "cookingwithtrevor",
    short_name: "cookingwithtrevor",
    description: "Recipes, food reviews and your grocery lists.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#fafaf9",
    theme_color: "#c2410c",
    icons: [
      { src: "/icons/192", sizes: "192x192", type: "image/png" },
      { src: "/icons/512", sizes: "512x512", type: "image/png" },
      { src: "/icons/maskable", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [{ name: "Grocery lists", url: "/grocery" }],
  };
}
