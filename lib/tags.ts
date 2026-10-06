import { slugify } from "@/lib/slugify";

// Tags are stored as slugs ("weeknight-dinner"), so they work as URLs as-is.
export const tagPath = (tag: string) => `/tags/${tag}`;

// "weeknight-dinner" -> "weeknight dinner"
export const tagLabel = (tag: string) => tag.replace(/-/g, " ");

// Only real tag slugs reach the database; anything else is a 404.
export function isTag(value: string): boolean {
  return value.length > 0 && slugify(value) === value;
}

// Every tag with how many posts use it, most used first, then A to Z.
export function countTags(posts: { tags: string[] }[]): { tag: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const post of posts) for (const tag of post.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1);
  return [...counts]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
}
