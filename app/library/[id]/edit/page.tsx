import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { RecipeForm } from "@/components/recipe-form";
import { requireUser } from "@/lib/auth";
import { toFormValues } from "@/lib/recipe-form";
import { displayPhotoUrls } from "@/lib/photos";
import { getOwnRecipe } from "@/lib/recipes";
import { deleteMyRecipe, saveMyRecipe } from "../../actions";

export const metadata: Metadata = { title: "Edit recipe", robots: { index: false } };

export default async function EditLibraryRecipePage({ params }: PageProps<"/library/[id]/edit">) {
  const { id } = await params;
  const { supabase, userId } = await requireUser(`/library/${id}/edit`);
  const recipe = await getOwnRecipe(supabase, id, userId);
  // Blog posts are edited in the dashboard, not here.
  if (!recipe || recipe.is_public) notFound();
  const photoPreview = recipe.photo_url
    ? (await displayPhotoUrls(supabase, [recipe.photo_url])).get(recipe.photo_url)
    : undefined;

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
      <h1 className="mb-6 text-2xl font-semibold text-stone-900">Edit recipe</h1>
      <RecipeForm
        variant="private"
        action={saveMyRecipe}
        deleteAction={deleteMyRecipe.bind(null, recipe.id)}
        id={recipe.id}
        savedSlug={recipe.slug}
        initial={toFormValues(recipe)}
        photoPreview={photoPreview}
      />
    </main>
  );
}
