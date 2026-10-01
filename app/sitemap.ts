import type { MetadataRoute } from "next";
import { blogPath, getPublishedBlogPosts } from "@/lib/blog";
import { getPublishedRecipes, postPath } from "@/lib/recipes";
import { siteUrl } from "@/lib/site-url";

// Lists the home page, each section and every published post (recipes,
// reviews and blog posts) so search engines find new posts.
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const [recipes, blogPosts] = await Promise.all([getPublishedRecipes(), getPublishedBlogPosts()]);

  return [
    { url: base, changeFrequency: "daily", priority: 1 },
    { url: `${base}/recipes`, changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/reviews`, changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/blog`, changeFrequency: "daily", priority: 0.9 },
    ...recipes.map((r) => ({
      url: `${base}${postPath(r)}`,
      lastModified: r.updated_at,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
    ...blogPosts.map((p) => ({
      url: `${base}${blogPath(p)}`,
      lastModified: p.updated_at,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
  ];
}
