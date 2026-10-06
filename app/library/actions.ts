"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { removePhoto } from "@/lib/photos";
import { readRecipeForm, validateRecipe, type RecipeFormState } from "@/lib/recipe-form";
import { slugify } from "@/lib/slugify";

export type NotesState = { message?: string; error?: string };

// Create or edit a private recipe in the user's own library.
export async function saveMyRecipe(
  _prev: RecipeFormState,
  formData: FormData,
): Promise<RecipeFormState> {
  const { supabase, userId } = await requireUser();
  const id = String(formData.get("id") ?? "") || null;
  // The library only holds recipes; reviews are blog posts made in the dashboard.
  const values = { ...readRecipeForm(formData), kind: "recipe" as const };

  // Photos must be in this user's own folder of the private bucket.
  const result = validateRecipe(values, { kind: "private", userId });
  if ("state" in result) return result.state;

  const { ingredients, steps, ...recipe } = result.data;
  // Imported recipes remember where they came from (set on create only).
  const sourceUrl = !id ? importedFrom(formData.get("source_url")) : null;
  // Private recipes never appear on the blog, so their slug only has to be unique.
  // Keep it stable on edit; on create add a random suffix to avoid collisions.
  const slug =
    String(formData.get("previous_slug") ?? "") ||
    `${slugify(recipe.title).slice(0, 80) || "recipe"}-${randomBytes(3).toString("hex")}`;

  // Remember the current photo so a replaced or removed one can be cleaned up.
  const previousPhoto = id
    ? (await supabase.from("recipes").select("photo_url").eq("id", id).maybeSingle<{ photo_url: string | null }>())
        .data?.photo_url ?? null
    : null;

  const { data, error } = await supabase
    .rpc("save_recipe", {
      p_id: id,
      p_recipe: { ...recipe, slug, is_public: false },
      p_ingredients: ingredients,
      p_steps: steps,
      p_add_to_library: !id,
    })
    .single<{ id: string; slug: string }>();

  if (error) return { error: `Could not save: ${error.message}`, values };

  if (sourceUrl) {
    // Best effort: the recipe is saved either way; only the source link would be missing.
    await supabase.from("recipes").update({ source_url: sourceUrl }).eq("id", data.id).eq("author_id", userId);
  }

  if (previousPhoto && previousPhoto !== recipe.photo_url) await removePhoto(supabase, previousPhoto);

  revalidatePath("/library");
  redirect(`/library/${data.id}`);
}

// Only plain http(s) links are stored as a recipe's source.
function importedFrom(value: FormDataEntryValue | null): string | null {
  const raw = String(value ?? "").trim();
  if (!raw || raw.length > 2000) return null;
  try {
    const url = new URL(raw);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}

export async function deleteMyRecipe(id: string): Promise<{ error?: string }> {
  const { supabase, userId } = await requireUser();
  const { data, error } = await supabase
    .from("recipes")
    .delete()
    .eq("id", id)
    .eq("author_id", userId)
    .eq("is_public", false)
    .select("id, photo_url");
  if (error) return { error: `Could not delete the recipe: ${error.message}` };
  const deleted = data as { id: string; photo_url: string | null }[];
  if (!deleted.length) return { error: "Could not delete the recipe: it wasn't found or you don't own it." };

  await removePhoto(supabase, deleted[0].photo_url);

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

  // Also take it out of the user's collections (RLS limits this to their own).
  // Ignored if the collections migration hasn't run yet.
  await supabase.from("collection_recipes").delete().eq("recipe_id", recipeId);

  revalidatePath("/library");
  redirect("/library");
}
