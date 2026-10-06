import type { Metadata } from "next";
import { PostGrid } from "@/components/post-grid";
import { getPublishedRecipes } from "@/lib/recipes";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Recipes",
  description: "Recipes for the stuff that I post on Instagram.",
  alternates: { canonical: "/recipes" },
};

export default async function RecipesPage() {
  const posts = await getPublishedRecipes({ kind: "recipe" });

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:py-14">
      <h1 className="text-4xl font-extrabold tracking-tight text-ink sm:text-6xl">Recipes</h1>
      <p className="mb-10 mt-3 max-w-prose text-lg text-stone-600">Recipes for the stuff that I post on Instagram.</p>
      <PostGrid posts={posts} empty="Recipes are on the way." preloadFirst />
    </main>
  );
}
