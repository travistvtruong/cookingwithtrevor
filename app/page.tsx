import { RecipeCard } from "@/components/recipe-card";
import { getPublishedRecipes } from "@/lib/recipes";

// Rebuilt on demand when a post is saved; this is a fallback refresh.
export const revalidate = 3600;

export default async function Home() {
  const recipes = await getPublishedRecipes();

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 sm:py-14">
      <h1 className="text-3xl font-semibold tracking-tight text-stone-900 sm:text-4xl">
        Recipes, minus the life story.
      </h1>

      {recipes.length === 0 ? (
        <p className="mt-6 text-stone-600">The first recipes are on the way.</p>
      ) : (
        <ul className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {recipes.map((recipe, i) => (
            <li key={recipe.id}>
              <RecipeCard recipe={recipe} preload={i === 0} />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
