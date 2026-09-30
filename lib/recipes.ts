import "server-only";
import { cache } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createPublicClient } from "@/lib/supabase/public";
import type { Ingredient } from "@/lib/ingredients";
import type { EditableRecipe } from "@/lib/recipe-form";

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

export type Review = {
  id: string;
  user_id: string;
  stars: number;
  comment: string;
  created_at: string;
  author: string;
};

export type Recipe = RecipeSummary & {
  ingredients: (Ingredient & { position: number })[];
  steps: { position: number; text: string }[];
  rating: { average: number; count: number } | null;
  reviews: Review[];
};

// Newest reviews shown on a post; the average and count cover all of them.
const REVIEWS_SHOWN = 50;

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

  const [{ data: rating }, { data: reviews, error: reviewsError }] = await Promise.all([
    supabase.from("recipe_ratings").select("average, count").eq("recipe_id", data.id).maybeSingle(),
    supabase
      .from("ratings_comments")
      .select("id, user_id, stars, comment, created_at, profiles (name)")
      .eq("recipe_id", data.id)
      .order("created_at", { ascending: false })
      .limit(REVIEWS_SHOWN),
  ]);
  if (reviewsError) throw reviewsError;

  return {
    ...data,
    rating: rating ?? null,
    reviews: (reviews ?? []).map(({ profiles, ...r }) => ({
      ...r,
      author: (profiles as unknown as { name: string } | null)?.name || "A reader",
    })),
  };
});

// A recipe the signed-in user wrote, with ingredients and steps, for editing.
export async function getOwnRecipe(
  supabase: SupabaseClient,
  id: string,
  userId: string,
): Promise<EditableRecipe | null> {
  const { data } = await supabase
    .from("recipes")
    .select(
      `id, title, slug, intro, photo_url, prep_min, cook_min, servings, tags, is_public,
       ingredients (position, quantity, unit, name),
       steps (position, text)`,
    )
    .eq("id", id)
    .eq("author_id", userId)
    .order("position", { referencedTable: "ingredients" })
    .order("position", { referencedTable: "steps" })
    .maybeSingle();
  return data;
}

export type LibraryItem = {
  notes: string;
  saved_at: string;
  recipe: RecipeSummary & { is_public: boolean; author_id: string };
};

// Everything in the user's library, newest first. Recipes that are no longer
// visible (e.g. a post the author unpublished) drop out.
export async function getLibrary(supabase: SupabaseClient, userId: string): Promise<LibraryItem[]> {
  const { data, error } = await supabase
    .from("saved_recipes")
    .select(`notes, saved_at:created_at, recipe:recipes (${SUMMARY_FIELDS}, is_public, author_id)`)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as unknown as LibraryItem[]).filter((item) => item.recipe);
}

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
