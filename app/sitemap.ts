import type { MetadataRoute } from "next";
import { blogPath, getPublishedBlogPosts } from "@/lib/blog";
import { getPublishedRecipes, postPath } from "@/lib/recipes";
import { siteUrl } from "@/lib/site-url";
import { countTags, tagPath } from "@/lib/tags";

// Lists the home page, each section and every published post (recipes,
// reviews and blog posts) so search engines find new posts.
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const [recipes, blogPosts] = await Promise.all([getPublishedRecipes(), getPublishedBlogPosts()]);
  const tags = countTags([...recipes, ...blogPosts]);

  return [
    { url: base, changeFrequency: "daily", priority: 1 },
    { url: `${base}/recipes`, changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/reviews`, changeFrequency: "daily", priority: 0.9 },
    ...(blogPosts.length ? [{ url: `${base}/blog`, changeFrequency: "daily" as const, priority: 0.9 }] : []),
    { url: `${base}/about`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/privacy`, changeFrequency: "yearly", priority: 0.2 },
    ...(tags.length ? [{ url: `${base}/tags`, changeFrequency: "weekly" as const, priority: 0.4 }] : []),
    ...tags.map(({ tag }) => ({ url: `${base}${tagPath(tag)}`, changeFrequency: "weekly" as const, priority: 0.4 })),
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
