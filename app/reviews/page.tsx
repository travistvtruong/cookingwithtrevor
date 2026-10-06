import type { Metadata } from "next";
import { PostGrid } from "@/components/post-grid";
import { getPublishedRecipes } from "@/lib/recipes";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Reviews",
  description: "Biased reviews of the places I've been and the food I've tried.",
  alternates: { canonical: "/reviews" },
};

export default async function ReviewsPage() {
  const posts = await getPublishedRecipes({ kind: "review" });

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:py-14">
      <h1 className="text-4xl font-extrabold tracking-tight text-ink sm:text-6xl">Reviews</h1>
      <p className="mb-10 mt-3 max-w-prose text-lg text-stone-600">Biased reviews of the places I&apos;ve been and the food I&apos;ve tried.</p>
      <PostGrid posts={posts} empty="Reviews are on the way." preloadFirst />
    </main>
  );
}
