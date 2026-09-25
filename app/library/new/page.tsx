import type { Metadata } from "next";
import { RecipeForm } from "@/components/recipe-form";
import { requireUser } from "@/lib/auth";
import { EMPTY_RECIPE } from "@/lib/recipe-form";
import { saveMyRecipe } from "../actions";

export const metadata: Metadata = { title: "Add a recipe", robots: { index: false } };

export default async function NewLibraryRecipePage() {
  await requireUser("/library/new");

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
      <h1 className="text-2xl font-semibold text-stone-900">Add a recipe</h1>
      <p className="mb-6 mt-1 text-sm text-stone-600">Only you can see recipes you add here.</p>
      <RecipeForm variant="private" action={saveMyRecipe} initial={EMPTY_RECIPE} />
    </main>
  );
}
