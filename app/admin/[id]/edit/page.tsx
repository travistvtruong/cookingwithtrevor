import Link from "next/link";
import { notFound } from "next/navigation";
import { RecipeForm } from "@/components/recipe-form";
import { requireAdmin } from "@/lib/auth";
import { toFormValues } from "@/lib/recipe-form";
import { getOwnRecipe, postPath } from "@/lib/recipes";
import { deleteRecipe, saveRecipe } from "../../actions";

export default async function EditRecipePage({ params }: PageProps<"/admin/[id]/edit">) {
  const { id } = await params;
  const { supabase, userId } = await requireAdmin();
  const recipe = await getOwnRecipe(supabase, id, userId);
  if (!recipe) notFound();

  return (
    <main className="max-w-2xl">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold text-stone-900">Edit post</h1>
          <span
            className={
              recipe.is_public
                ? "rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800"
                : "rounded-full bg-stone-100 px-2 py-0.5 text-xs font-medium text-stone-700"
            }
          >
            {recipe.is_public ? "Published" : "Draft"}
          </span>
        </div>
        {recipe.is_public && (
          <Link href={postPath(recipe)} className="inline-block py-1.5 text-sm text-brand hover:underline">
            View post
          </Link>
        )}
      </div>
      <RecipeForm
        variant="post"
        action={saveRecipe}
        deleteAction={deleteRecipe.bind(null, recipe.id, recipe.slug)}
        id={recipe.id}
        savedSlug={recipe.slug}
        initial={toFormValues(recipe)}
      />
    </main>
  );
}
