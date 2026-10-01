import { z } from "zod";
import { formatIngredient, parseIngredient, type Ingredient } from "@/lib/ingredients";
import { isOwnPrivatePhoto, photoRef, PUBLIC_BUCKET } from "@/lib/photos";
import { slugify } from "@/lib/slugify";

// Shared by the author dashboard (blog posts) and the library (private recipes).

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

export const EMPTY_RECIPE: RecipeFormValues = {
  title: "",
  slug: "",
  intro: "",
  photo_url: "",
  prep_min: "",
  cook_min: "",
  servings: "",
  tags: "",
  ingredients: "",
  steps: "",
  is_public: false,
};

export type EditableRecipe = {
  id: string;
  title: string;
  slug: string;
  intro: string;
  photo_url: string | null;
  prep_min: number | null;
  cook_min: number | null;
  servings: number | null;
  tags: string[];
  is_public: boolean;
  ingredients: Ingredient[];
  steps: { text: string }[];
};

// Turn a saved recipe back into the text the form edits.
export function toFormValues(recipe: EditableRecipe): RecipeFormValues {
  const num = (n: number | null) => (n == null ? "" : String(n));
  return {
    title: recipe.title,
    slug: recipe.slug,
    intro: recipe.intro,
    photo_url: recipe.photo_url ?? "",
    prep_min: num(recipe.prep_min),
    cook_min: num(recipe.cook_min),
    servings: num(recipe.servings),
    tags: recipe.tags.join(", "),
    ingredients: recipe.ingredients.map(formatIngredient).join("\n"),
    steps: recipe.steps.map((s) => s.text).join("\n"),
    is_public: recipe.is_public,
  };
}


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

export type ParsedRecipe = z.output<typeof recipeSchema>;

export function readRecipeForm(formData: FormData): RecipeFormValues {
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

// Which photos a form may point at: blog posts use the public bucket (admin
// uploads); private recipes use the owner's own folder in the private bucket.
export type PhotoRule = { kind: "public" } | { kind: "private"; userId: string };

function photoAllowed(value: string, rule: PhotoRule) {
  if (value === "") return true;
  const ref = photoRef(value);
  if (rule.kind === "public") return ref?.bucket === PUBLIC_BUCKET;
  return isOwnPrivatePhoto(value, rule.userId);
}

export function validateRecipe(
  values: RecipeFormValues,
  photoRule: PhotoRule = { kind: "public" },
): { data: ParsedRecipe } | { state: RecipeFormState } {
  const parsed = recipeSchema
    .refine((v) => photoAllowed(v.photo_url ?? "", photoRule), {
      path: ["photo_url"],
      message: "Upload the photo using the button.",
    })
    .safeParse(values);
  if (parsed.success) return { data: parsed.data };

  const fieldErrors: RecipeFormState["fieldErrors"] = {};
  for (const issue of parsed.error.issues) {
    const key = issue.path[0] as keyof RecipeFormValues;
    fieldErrors[key] ??= issue.message;
  }
  return { state: { error: "Please fix the highlighted fields.", fieldErrors, values } };
}
