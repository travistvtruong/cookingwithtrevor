"use server";

import { requireUser } from "@/lib/auth";
import type { RecipeFormValues } from "@/lib/recipe-form";
import { extractRecipe, importToFormValues } from "@/lib/recipe-import";
import { FetchRefused, fetchPublicHtml } from "@/lib/safe-fetch";

export type ImportState = {
  error?: string;
  values?: RecipeFormValues;
  sourceUrl?: string;
  // Changes on every successful import so the form below reloads its fields.
  importedAt?: number;
};

// Saved imports allowed per user per hour (PRD: rate limits on imports).
const IMPORTS_PER_HOUR = 20;

// Step 1 of importing (R7): read the recipe from a link into the form.
// Nothing is saved until the user checks it and presses Save.
export async function importRecipe(_prev: ImportState, formData: FormData): Promise<ImportState> {
  const { supabase, userId } = await requireUser("/library/new");
  const raw = String(formData.get("url") ?? "").trim();
  if (!raw) return { error: "Paste a link to a recipe." };

  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count } = await supabase
    .from("recipes")
    .select("id", { count: "exact", head: true })
    .eq("author_id", userId)
    .not("source_url", "is", null)
    .gte("created_at", since);
  if ((count ?? 0) >= IMPORTS_PER_HOUR) {
    return { error: "You've imported a lot of recipes in the last hour. Try again a bit later." };
  }

  let page: { html: string; finalUrl: string };
  try {
    page = await fetchPublicHtml(raw);
  } catch (e) {
    if (e instanceof FetchRefused) return { error: e.message };
    throw e;
  }

  const recipe = extractRecipe(page.html);
  if (!recipe) {
    return {
      error: "Couldn't find a recipe on that page. Some sites don't share their recipe data; you can type it in below instead.",
    };
  }
  return { values: importToFormValues(recipe), sourceUrl: page.finalUrl, importedAt: Date.now() };
}
