import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

export type Collection = { id: string; name: string; recipeIds: string[] };

export const MAX_COLLECTION_NAME = 60;

// The user's collections, alphabetical, with the recipes in each. Until the
// collections migration has run, there are simply none.
export async function getCollections(supabase: SupabaseClient, userId: string): Promise<Collection[]> {
  const { data, error } = await supabase
    .from("collections")
    .select("id, name, collection_recipes (recipe_id)")
    .eq("user_id", userId)
    .order("name");
  if (error) {
    if (error.code === "PGRST205" || error.code === "42P01") return [];
    throw error;
  }
  return (data as { id: string; name: string; collection_recipes: { recipe_id: string }[] }[]).map((c) => ({
    id: c.id,
    name: c.name,
    recipeIds: c.collection_recipes.map((r) => r.recipe_id),
  }));
}

// "  Weeknight   dinners " -> "Weeknight dinners"
export function cleanCollectionName(raw: unknown): string {
  return typeof raw === "string" ? raw.replace(/\s+/g, " ").trim() : "";
}
