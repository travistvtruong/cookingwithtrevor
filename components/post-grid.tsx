import { RecipeCard } from "@/components/recipe-card";
import type { RecipeSummary } from "@/lib/recipes";

// A responsive grid of post cards, with a message when there's nothing yet.
export function PostGrid({ posts, empty }: { posts: RecipeSummary[]; empty: string }) {
  if (posts.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-stone-300 p-10 text-center text-stone-600">{empty}</p>
    );
  }
  return (
    <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {posts.map((post) => (
        <li key={post.id}>
          <RecipeCard recipe={post} />
        </li>
      ))}
    </ul>
  );
}
