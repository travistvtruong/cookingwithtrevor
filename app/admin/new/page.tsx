import { RecipeForm } from "@/components/recipe-form";
import { EMPTY_RECIPE } from "@/lib/recipe-form";
import { saveRecipe } from "../actions";

export default function NewRecipePage() {
  return (
    <main className="max-w-2xl">
      <h1 className="mb-6 text-2xl font-semibold text-stone-900">New post</h1>
      <RecipeForm variant="post" action={saveRecipe} initial={EMPTY_RECIPE} />
    </main>
  );
}
