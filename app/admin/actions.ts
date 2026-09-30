"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { readRecipeForm, validateRecipe, type RecipeFormState } from "@/lib/recipe-form";
import { slugify } from "@/lib/slugify";

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

  revalidatePath("/");
  revalidatePath(`/recipes/${data.slug}`);
  if (previousSlug && previousSlug !== data.slug) revalidatePath(`/recipes/${previousSlug}`);

  redirect("/admin");
}

export async function deleteRecipe(id: string, slug: string): Promise<{ error?: string }> {
  const { supabase } = await requireAdmin();
  // RLS blocks silently (0 rows, no error), so check that a row was actually deleted.
  const { data, error } = await supabase.from("recipes").delete().eq("id", id).select("id");
  if (error) return { error: `Could not delete the post: ${error.message}` };
  if (!data.length) return { error: "Could not delete the post: it wasn't found or you don't own it." };

  revalidatePath("/");
  revalidatePath(`/recipes/${slug}`);
  redirect("/admin");
}
