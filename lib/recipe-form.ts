import { z } from "zod";
import { formatIngredient, parseIngredient, type Ingredient } from "@/lib/ingredients";
import { isOwnPrivatePhoto, photoRef, PUBLIC_BUCKET } from "@/lib/photos";
import { slugify } from "@/lib/slugify";

// Shared by the author dashboard (blog posts) and the library (private recipes).

export type PostKind = "recipe" | "review";

export type RecipeFormValues = {
  kind: PostKind;
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
  // Review posts only
  place_name: string;
  place_location: string;
  my_rating: string;
  is_public: boolean;
};

export type RecipeFormState = {
  error?: string;
  fieldErrors?: Partial<Record<keyof RecipeFormValues, string>>;
  values?: RecipeFormValues;
};

export const EMPTY_RECIPE: RecipeFormValues = {
  kind: "recipe",
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
  place_name: "",
  place_location: "",
  my_rating: "",
  is_public: false,
};

export type EditableRecipe = {
  id: string;
  kind: PostKind;
  place_name: string | null;
  place_location: string | null;
  my_rating: number | null;
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
    kind: recipe.kind,
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
    place_name: recipe.place_name ?? "",
    place_location: recipe.place_location ?? "",
    my_rating: num(recipe.my_rating),
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

const none = z.string().optional().transform(() => null);
const noLines = z.string().optional().transform((): never[] => []);

// Recipes need ingredients and steps; reviews need a place and your rating
// instead. Fields that don't apply to a kind are cleared, not validated.
function schemaFor(kind: PostKind) {
  const isRecipe = kind === "recipe";
  return z.object({
    kind: z.enum(["recipe", "review"]),
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
    prep_min: isRecipe ? optionalInt(0, 1440) : none,
    cook_min: isRecipe ? optionalInt(0, 1440) : none,
    servings: isRecipe ? optionalInt(1, 100) : none,
    tags: z.string().transform((v) =>
      [...new Set(v.split(",").map(slugify).filter(Boolean))].slice(0, 10),
    ),
    ingredients: isRecipe
      ? z
          .string()
          .transform(lines)
          .pipe(z.array(z.string().max(200)).min(1, "Add at least one ingredient.").max(100))
          .transform((ls) => ls.map(parseIngredient).filter((i) => i.name))
      : noLines,
    steps: isRecipe
      ? z
          .string()
          .transform(lines)
          .pipe(z.array(z.string().max(2000)).min(1, "Add at least one step.").max(100))
      : noLines,
    place_name: isRecipe
      ? none
      : z.string().trim().min(1, "Add the place or dish you're reviewing.").max(200),
    place_location: isRecipe ? none : z.string().trim().max(200).transform((v) => v || null),
    my_rating: isRecipe
      ? none
      : z
          .string()
          .trim()
          .transform(Number)
          .pipe(
            z
              .number({ error: "Pick your rating." })
              .int("Pick your rating.")
              .min(1, "Pick your rating.")
              .max(5, "Pick your rating."),
          ),
    is_public: z.boolean(),
  });
}

export type ParsedRecipe = {
  kind: PostKind;
  title: string;
  slug: string;
  intro: string;
  photo_url: string | null;
  prep_min: number | null;
  cook_min: number | null;
  servings: number | null;
  tags: string[];
  ingredients: Ingredient[];
  steps: string[];
  place_name: string | null;
  place_location: string | null;
  my_rating: number | null;
  is_public: boolean;
};

export function readRecipeForm(formData: FormData): RecipeFormValues {
  const get = (key: string) => String(formData.get(key) ?? "");
  return {
    kind: get("kind") === "review" ? "review" : "recipe",
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
    place_name: get("place_name"),
    place_location: get("place_location"),
    my_rating: get("my_rating"),
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
  const parsed = schemaFor(values.kind)
    .refine((v) => photoAllowed(v.photo_url ?? "", photoRule), {
      path: ["photo_url"],
      message: "Upload the photo using the button.",
    })
    .safeParse(values);
  if (parsed.success) return { data: parsed.data as ParsedRecipe };

  const fieldErrors: RecipeFormState["fieldErrors"] = {};
  for (const issue of parsed.error.issues) {
    const key = issue.path[0] as keyof RecipeFormValues;
    fieldErrors[key] ??= issue.message;
  }
  return { state: { error: "Please fix the highlighted fields.", fieldErrors, values } };
}
