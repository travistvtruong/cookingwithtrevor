import type { MetadataRoute } from "next";
import { getPublishedRecipes } from "@/lib/recipes";
import { siteUrl } from "@/lib/site-url";

// Lists the home page and every published post so search engines find new posts.
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const recipes = await getPublishedRecipes();

  return [
    { url: base, changeFrequency: "daily", priority: 1 },
    ...recipes.map((r) => ({
      url: `${base}/recipes/${r.slug}`,
      lastModified: r.updated_at,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
  ];
}
