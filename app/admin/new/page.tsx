import { RecipeForm } from "@/components/recipe-form";
import { EMPTY_RECIPE } from "@/lib/recipe-form";
import { saveRecipe } from "../actions";

// /admin/new for a recipe, /admin/new?kind=review for a food review.
// The type can still be switched at the top of the form.
export default async function NewPostPage({ searchParams }: PageProps<"/admin/new">) {
  const { kind } = await searchParams;
  const isReview = kind === "review";

  return (
    <main className="max-w-2xl">
      <h1 className="mb-6 text-2xl font-extrabold text-ink">{isReview ? "New review" : "New recipe"}</h1>
      <RecipeForm
        variant="post"
        action={saveRecipe}
        initial={{ ...EMPTY_RECIPE, kind: isReview ? "review" : "recipe" }}
      />
    </main>
  );
}
