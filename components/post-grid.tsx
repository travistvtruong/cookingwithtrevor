import { RecipeCard } from "@/components/recipe-card";
import type { RecipeSummary } from "@/lib/recipes";

// A responsive grid of post cards, with a message when there's nothing yet.
// preloadFirst: the grid is at the top of the page, so the first photo is
// likely the largest thing on screen; load it immediately instead of lazily.
export function PostGrid({
  posts,
  empty,
  preloadFirst = false,
}: {
  posts: RecipeSummary[];
  empty: string;
  preloadFirst?: boolean;
}) {
  if (posts.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-stone-300 p-10 text-center text-stone-600">{empty}</p>
    );
  }
  return (
    <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {posts.map((post, i) => (
        <li key={post.id}>
          <RecipeCard recipe={post} preload={preloadFirst && i === 0} />
        </li>
      ))}
    </ul>
  );
}
