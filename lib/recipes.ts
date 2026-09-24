import "server-only";
import { cache } from "react";
import { createPublicClient } from "@/lib/supabase/public";
import type { Ingredient } from "@/lib/ingredients";

export type RecipeSummary = {
  id: string;
  title: string;
  slug: string;
  intro: string;
  photo_url: string | null;
  prep_min: number | null;
  cook_min: number | null;
  servings: number | null;
  tags: string[];
  published_at: string | null;
  updated_at: string;
};

export type Recipe = RecipeSummary & {
  ingredients: (Ingredient & { position: number })[];
  steps: { position: number; text: string }[];
  rating: { average: number; count: number } | null;
};

const SUMMARY_FIELDS =
  "id, title, slug, intro, photo_url, prep_min, cook_min, servings, tags, published_at, updated_at";

export async function getPublishedRecipes(): Promise<RecipeSummary[]> {
  const { data, error } = await createPublicClient()
    .from("recipes")
    .select(SUMMARY_FIELDS)
    .eq("is_public", true)
    .order("published_at", { ascending: false });
  if (error) throw error;
  return data;
}

// Wrapped in React cache so generateMetadata and the page share one query.
export const getPublishedRecipe = cache(async (slug: string): Promise<Recipe | null> => {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("recipes")
    .select(
      `${SUMMARY_FIELDS},
       ingredients (position, quantity, unit, name),
       steps (position, text)`,
    )
    .eq("slug", slug)
    .eq("is_public", true)
    .order("position", { referencedTable: "ingredients" })
    .order("position", { referencedTable: "steps" })
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const { data: rating } = await supabase
    .from("recipe_ratings")
    .select("average, count")
    .eq("recipe_id", data.id)
    .maybeSingle();

  return { ...data, rating: rating ?? null };
});

export function totalMinutes(r: Pick<RecipeSummary, "prep_min" | "cook_min">) {
  const total = (r.prep_min ?? 0) + (r.cook_min ?? 0);
  return total || null;
}

export function formatMinutes(min: number) {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} hr ${m} min` : `${h} hr`;
}
