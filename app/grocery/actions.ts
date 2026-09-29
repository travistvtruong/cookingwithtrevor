"use server";

import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { mergeIngredients } from "@/lib/grocery";
import type { Ingredient } from "@/lib/ingredients";

export type NewListState = { error?: string };

const MAX_RECIPES = 20;

export async function createGroceryList(
  _prev: NewListState,
  formData: FormData,
): Promise<NewListState> {
  const { supabase } = await requireUser("/grocery/new");
  const recipeIds = [...new Set(formData.getAll("recipe").map(String))].slice(0, MAX_RECIPES);
  if (recipeIds.length === 0) return { error: "Pick at least one recipe." };

  // RLS only returns recipes this user can see (public posts or their own).
  const [{ data: recipes }, { data: ingredients, error }] = await Promise.all([
    supabase.from("recipes").select("id, title").in("id", recipeIds),
    supabase.from("ingredients").select("quantity, unit, name").in("recipe_id", recipeIds),
  ]);
  if (error || !recipes?.length) return { error: "Could not load those recipes. Please try again." };

  const items = mergeIngredients((ingredients ?? []) as Ingredient[]);
  const titles = recipes.map((r) => r.title);
  const name = String(formData.get("name") ?? "").trim() ||
    (titles.length <= 2 ? titles.join(" + ") : `${titles[0]} + ${titles.length - 1} more`);

  const { data: listId, error: createError } = await supabase.rpc("create_grocery_list", {
    p_name: name,
    p_items: items,
  });
  if (createError) return { error: `Could not create the list: ${createError.message}` };

  redirect(`/grocery/${listId}`);
}

export async function deleteGroceryList(id: string) {
  const { supabase, userId } = await requireUser("/grocery");
  const { error } = await supabase.from("grocery_lists").delete().eq("id", id).eq("user_id", userId);
  if (error) throw error;
  redirect("/grocery");
}
