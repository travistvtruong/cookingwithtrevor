import type { MetadataRoute } from "next";
import { getPublishedRecipes, postPath } from "@/lib/recipes";
import { siteUrl } from "@/lib/site-url";

// Lists the home page, both sections and every published post (recipes and
// reviews) so search engines find new posts.
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const recipes = await getPublishedRecipes();

  return [
    { url: base, changeFrequency: "daily", priority: 1 },
    { url: `${base}/recipes`, changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/reviews`, changeFrequency: "daily", priority: 0.9 },
    ...recipes.map((r) => ({
      url: `${base}${postPath(r)}`,
      lastModified: r.updated_at,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
  ];
}
