"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { parseIngredient } from "@/lib/ingredients";
import { slugify } from "@/lib/slugify";

export type RecipeFormValues = {
  title: string;
  slug: string;
  intro: string;
  photo_url: string;
  prep_min: string;
  cook_min: string;
  servings: string;
  tags: string;
  ingredients: string;
  steps: string;
  is_public: boolean;
};

export type RecipeFormState = {
  error?: string;
  fieldErrors?: Partial<Record<keyof RecipeFormValues, string>>;
  values?: RecipeFormValues;
};

const photoPrefix = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/recipe-photos/`;

const optionalInt = (min: number, max: number) =>
  z
    .string()
    .trim()
    .transform((v) => (v === "" ? null : Number(v)))
    .pipe(z.number().int().min(min).max(max).nullable());

const lines = (text: string) =>
  text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

const recipeSchema = z.object({
  title: z.string().trim().min(1, "Title is required.").max(200),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .max(100)
    .regex(/^([a-z0-9]+(-[a-z0-9]+)*)?$/, "Use lowercase letters, numbers and dashes."),
  intro: z.string().trim().max(10000),
  photo_url: z
    .string()
    .trim()
    .refine((v) => v === "" || v.startsWith(photoPrefix), "Upload the photo using the button.")
    .transform((v) => v || null),
  prep_min: optionalInt(0, 1440),
  cook_min: optionalInt(0, 1440),
  servings: optionalInt(1, 100),
  tags: z.string().transform((v) =>
    [...new Set(v.split(",").map(slugify).filter(Boolean))].slice(0, 10),
  ),
  ingredients: z
    .string()
    .transform(lines)
    .pipe(z.array(z.string().max(200)).min(1, "Add at least one ingredient.").max(100))
    .transform((ls) => ls.map(parseIngredient).filter((i) => i.name)),
  steps: z
    .string()
    .transform(lines)
    .pipe(z.array(z.string().max(2000)).min(1, "Add at least one step.").max(100)),
  is_public: z.boolean(),
});

function readValues(formData: FormData): RecipeFormValues {
  const get = (key: string) => String(formData.get(key) ?? "");
  return {
    title: get("title"),
    slug: get("slug"),
    intro: get("intro"),
    photo_url: get("photo_url"),
    prep_min: get("prep_min"),
    cook_min: get("cook_min"),
    servings: get("servings"),
    tags: get("tags"),
    ingredients: get("ingredients"),
    steps: get("steps"),
    is_public: formData.get("intent") === "publish",
  };
}

export async function saveRecipe(
  _prev: RecipeFormState,
  formData: FormData,
): Promise<RecipeFormState> {
  const { supabase } = await requireAdmin();
  const id = String(formData.get("id") ?? "") || null;
  const previousSlug = String(formData.get("previous_slug") ?? "");
  const values = readValues(formData);

  const parsed = recipeSchema.safeParse(values);
  if (!parsed.success) {
    const fieldErrors: RecipeFormState["fieldErrors"] = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0] as keyof RecipeFormValues;
      fieldErrors[key] ??= issue.message;
    }
    return { error: "Please fix the highlighted fields.", fieldErrors, values };
  }

  const { ingredients, steps, ...recipe } = parsed.data;
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

export async function deleteRecipe(id: string, slug: string) {
  const { supabase } = await requireAdmin();
  const { error } = await supabase.from("recipes").delete().eq("id", id);
  if (error) throw error;

  revalidatePath("/");
  revalidatePath(`/recipes/${slug}`);
  redirect("/admin");
}
