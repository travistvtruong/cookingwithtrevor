import type { Metadata } from "next";
import Link from "next/link";
import { getPublishedBlogPosts } from "@/lib/blog";
import { getPublishedRecipes } from "@/lib/recipes";
import { countTags, tagLabel, tagPath } from "@/lib/tags";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Tags",
  description: "Browse recipes, reviews and posts by tag.",
  alternates: { canonical: "/tags" },
};

export default async function TagsPage() {
  const [posts, blogPosts] = await Promise.all([getPublishedRecipes(), getPublishedBlogPosts()]);
  const tags = countTags([...posts, ...blogPosts]);

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:py-14">
      <h1 className="text-4xl font-extrabold tracking-tight text-ink sm:text-6xl">Tags</h1>
      <p className="mb-10 mt-3 text-lg text-stone-600">Browse everything by tag.</p>
      {tags.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-stone-300 p-10 text-center text-stone-600">
          No tags yet.
        </p>
      ) : (
        <ul className="flex flex-wrap gap-3">
          {tags.map(({ tag, count }) => (
            <li key={tag}>
              <Link
                href={tagPath(tag)}
                className="inline-flex items-center gap-2 rounded-full border border-stone-300 bg-white px-4 py-2 font-semibold text-ink hover:border-brand hover:text-brand"
              >
                #{tagLabel(tag)}
                <span className="text-sm font-normal text-stone-500">{count}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
