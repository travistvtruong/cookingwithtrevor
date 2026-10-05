import type { Metadata } from "next";
import { BlogGrid } from "@/components/blog-grid";
import { getPublishedBlogPosts } from "@/lib/blog";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Blog",
  description: "Stories, tips and notes from the kitchen and beyond.",
  alternates: { canonical: "/blog" },
};

export default async function BlogPage() {
  const posts = await getPublishedBlogPosts();

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:py-14">
      <h1 className="text-4xl font-extrabold tracking-tight text-ink sm:text-6xl">Blog</h1>
      <p className="mb-10 mt-3 max-w-prose text-lg text-stone-600">
        Stories, tips and notes from the kitchen and beyond.
      </p>
      <BlogGrid posts={posts} empty="Blog posts are on the way." preloadFirst />
    </main>
  );
}
