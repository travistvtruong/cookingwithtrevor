"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { logAdminAction } from "@/lib/audit";
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

  // Remember the current photo (to clean up a replaced one) and whether it was
  // published (for the audit log).
  const previous = id
    ? (
        await supabase
          .from("recipes")
          .select("photo_url, is_public")
          .eq("id", id)
          .maybeSingle<{ photo_url: string | null; is_public: boolean }>()
      ).data
    : null;
  const previousPhoto = previous?.photo_url ?? null;

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

  const wasPublic = previous?.is_public ?? false;
  await logAdminAction(supabase, {
    action: `${recipe.kind}.${
      recipe.is_public && !wasPublic
        ? "published"
        : !recipe.is_public && wasPublic
          ? "unpublished"
          : id
            ? "updated"
            : "created"
    }`,
    entityType: recipe.kind,
    entityId: data.id,
    summary: recipe.title,
    details: { slug: data.slug },
  });

  revalidatePosts(data.slug, previousSlug);
  redirect("/admin");
}

export async function deleteRecipe(id: string, slug: string): Promise<{ error?: string }> {
  const { supabase } = await requireAdmin();
  // RLS blocks silently (0 rows, no error), so check that a row was actually deleted.
  const { data, error } = await supabase.from("recipes").delete().eq("id", id).select("id, kind, title, photo_url");
  if (error) return { error: `Could not delete the post: ${error.message}` };
  const deleted = data as { id: string; kind: "recipe" | "review"; title: string; photo_url: string | null }[];
  if (!deleted.length) return { error: "Could not delete the post: it wasn't found or you don't own it." };

  await removePhoto(supabase, deleted[0].photo_url);
  await logAdminAction(supabase, {
    action: `${deleted[0].kind}.deleted`,
    entityType: deleted[0].kind,
    entityId: id,
    summary: deleted[0].title,
    details: { slug },
  });

  revalidatePosts(slug);
  redirect("/admin");
}
