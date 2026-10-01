"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { removePhoto } from "@/lib/photos";
import { readRecipeForm, validateRecipe, type RecipeFormState } from "@/lib/recipe-form";
import { slugify } from "@/lib/slugify";

// Refresh every cached page a post can appear on: home, both index pages and
// the post itself (under either kind, since a post's kind can change).
function revalidatePosts(...slugs: string[]) {
  revalidatePath("/");
  revalidatePath("/recipes");
  revalidatePath("/reviews");
  for (const slug of new Set(slugs.filter(Boolean))) {
    revalidatePath(`/recipes/${slug}`);
    revalidatePath(`/reviews/${slug}`);
  }
}

export async function saveRecipe(
  _prev: RecipeFormState,
  formData: FormData,
): Promise<RecipeFormState> {
  const { supabase } = await requireAdmin();
  const id = String(formData.get("id") ?? "") || null;
  const previousSlug = String(formData.get("previous_slug") ?? "");
  const values = readRecipeForm(formData);

  const result = validateRecipe(values);
  if ("state" in result) return result.state;

  const { ingredients, steps, ...recipe } = result.data;
  recipe.slug ||= slugify(recipe.title);
  if (!recipe.slug) {
    return { fieldErrors: { slug: "Add a URL slug." }, values };
  }

  // Remember the current photo so a replaced or removed one can be cleaned up.
  const previousPhoto = id
    ? (await supabase.from("recipes").select("photo_url").eq("id", id).maybeSingle<{ photo_url: string | null }>())
        .data?.photo_url ?? null
    : null;

  const { data, error } = await supabase
    .rpc("save_recipe", {
      p_id: id,
      p_recipe: recipe,
      p_ingredients: ingredients,
      p_steps: steps,
    })
    .single<{ id: string; slug: string }>();

  if (error) {
    if (error.code === "23505") {
      return { fieldErrors: { slug: "Another recipe already uses this URL." }, values };
    }
    return { error: `Could not save: ${error.message}`, values };
  }

  if (previousPhoto && previousPhoto !== recipe.photo_url) await removePhoto(supabase, previousPhoto);

  revalidatePosts(data.slug, previousSlug);
  redirect("/admin");
}

export async function deleteRecipe(id: string, slug: string): Promise<{ error?: string }> {
  const { supabase } = await requireAdmin();
  // RLS blocks silently (0 rows, no error), so check that a row was actually deleted.
  const { data, error } = await supabase.from("recipes").delete().eq("id", id).select("id, photo_url");
  if (error) return { error: `Could not delete the post: ${error.message}` };
  const deleted = data as { id: string; photo_url: string | null }[];
  if (!deleted.length) return { error: "Could not delete the post: it wasn't found or you don't own it." };

  await removePhoto(supabase, deleted[0].photo_url);

  revalidatePosts(slug);
  redirect("/admin");
}
