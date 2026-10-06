import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { BlogGrid } from "@/components/blog-grid";
import { PostGrid } from "@/components/post-grid";
import { getPublishedBlogPosts } from "@/lib/blog";
import { getPublishedRecipes } from "@/lib/recipes";
import { isTag, tagLabel, tagPath } from "@/lib/tags";

// Built on first visit, cached, refreshed every minute and when a post is saved.
export const revalidate = 60;

export async function generateStaticParams() {
  return [];
}

// Wrapped in React cache so generateMetadata and the page share one lookup.
const postsTagged = cache(async (tag: string) => {
  if (!isTag(tag)) return null;
  const [posts, blogPosts] = await Promise.all([getPublishedRecipes({ tag }), getPublishedBlogPosts({ tag })]);
  return posts.length + blogPosts.length > 0 ? { posts, blogPosts } : null;
});

export async function generateMetadata({ params }: PageProps<"/tags/[tag]">): Promise<Metadata> {
  const { tag } = await params;
  if (!(await postsTagged(tag))) return {};
  return {
    title: `#${tagLabel(tag)}`,
    description: `Recipes, reviews and posts tagged ${tagLabel(tag)}.`,
    alternates: { canonical: tagPath(tag) },
  };
}

export default async function TagPage({ params }: PageProps<"/tags/[tag]">) {
  const { tag } = await params;
  const found = await postsTagged(tag);
  if (!found) notFound();

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:py-14">
      <Link href="/tags" className="inline-block py-1.5 text-sm text-brand hover:underline">
        ← All tags
      </Link>
      <h1 className="mt-2 text-4xl font-extrabold tracking-tight text-ink sm:text-6xl">#{tagLabel(tag)}</h1>
      <p className="mb-10 mt-3 text-lg text-stone-600">
        {found.posts.length + found.blogPosts.length} post{found.posts.length + found.blogPosts.length === 1 ? "" : "s"}
      </p>
      {found.posts.length > 0 && <PostGrid posts={found.posts} empty="" preloadFirst />}
      {found.blogPosts.length > 0 && (
        <section className="mt-12">
          <h2 className="mb-6 text-2xl font-extrabold text-ink">From the blog</h2>
          <BlogGrid posts={found.blogPosts} empty="" />
        </section>
      )}
    </main>
  );
}
