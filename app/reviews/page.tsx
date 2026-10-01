import type { Metadata } from "next";
import { PostGrid } from "@/components/post-grid";
import { getPublishedRecipes } from "@/lib/recipes";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Reviews",
  description: "Honest reviews of places I've eaten and dishes I've tried.",
  alternates: { canonical: "/reviews" },
};

export default async function ReviewsPage() {
  const posts = await getPublishedRecipes({ kind: "review" });

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:py-14">
      <h1 className="text-4xl font-extrabold tracking-tight text-ink sm:text-6xl">Reviews</h1>
      <p className="mb-10 mt-3 max-w-prose text-lg text-stone-600">Honest reviews of places I&apos;ve eaten and dishes I&apos;ve tried.</p>
      <PostGrid posts={posts} empty="Reviews are on the way." />
    </main>
  );
}
