"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { readRecipeForm, validateRecipe, type RecipeFormState } from "@/lib/recipe-form";
import { slugify } from "@/lib/slugify";

export type NotesState = { message?: string; error?: string };

// Create or edit a private recipe in the user's own library.
export async function saveMyRecipe(
  _prev: RecipeFormState,
  formData: FormData,
): Promise<RecipeFormState> {
  const { supabase } = await requireUser();
  const id = String(formData.get("id") ?? "") || null;
  const values = readRecipeForm(formData);

  const result = validateRecipe(values);
  if ("state" in result) return result.state;

  const { ingredients, steps, ...recipe } = result.data;
  // Private recipes never appear on the blog, so their slug only has to be unique.
  // Keep it stable on edit; on create add a random suffix to avoid collisions.
  const slug =
    String(formData.get("previous_slug") ?? "") ||
    `${slugify(recipe.title).slice(0, 80) || "recipe"}-${randomBytes(3).toString("hex")}`;

  const { data, error } = await supabase
    .rpc("save_recipe", {
      p_id: id,
      p_recipe: { ...recipe, slug, photo_url: null, is_public: false },
      p_ingredients: ingredients,
      p_steps: steps,
      p_add_to_library: !id,
    })
    .single<{ id: string; slug: string }>();

  if (error) return { error: `Could not save: ${error.message}`, values };

  revalidatePath("/library");
  redirect(`/library/${data.id}`);
}

export async function deleteMyRecipe(id: string): Promise<{ error?: string }> {
  const { supabase, userId } = await requireUser();
  const { data, error } = await supabase
    .from("recipes")
    .delete()
    .eq("id", id)
    .eq("author_id", userId)
    .eq("is_public", false)
    .select("id");
  if (error) return { error: `Could not delete the recipe: ${error.message}` };
  if (!data.length) return { error: "Could not delete the recipe: it wasn't found or you don't own it." };

  revalidatePath("/library");
  redirect("/library");
}

export async function updateNotes(
  recipeId: string,
  _prev: NotesState,
  formData: FormData,
): Promise<NotesState> {
  const { supabase, userId } = await requireUser();
  const notes = String(formData.get("notes") ?? "").slice(0, 5000);

  const { error } = await supabase
    .from("saved_recipes")
    .update({ notes })
    .eq("user_id", userId)
    .eq("recipe_id", recipeId);
  if (error) return { error: "Could not save notes. Please try again." };

  return { message: "Notes saved." };
}

export async function removeFromLibrary(recipeId: string) {
  const { supabase, userId } = await requireUser();
  const { error } = await supabase
    .from("saved_recipes")
    .delete()
    .eq("user_id", userId)
    .eq("recipe_id", recipeId);
  if (error) throw error;

  revalidatePath("/library");
  redirect("/library");
}
