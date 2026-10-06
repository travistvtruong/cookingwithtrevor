import { EMPTY_RECIPE, type RecipeFormValues } from "@/lib/recipe-form";
import { slugify } from "@/lib/slugify";

// Import a recipe from a web page (R7). Most recipe sites embed schema.org
// Recipe data as JSON-LD for search engines; this reads it into the same text
// the recipe form edits, so the user checks everything before saving.
// The photo is never copied: imports stay private and link to their source.

export type ImportedRecipe = {
  title: string;
  intro: string;
  prepMin: number | null;
  cookMin: number | null;
  servings: number | null;
  tags: string[];
  ingredients: string[];
  steps: string[];
};

type Json = null | boolean | number | string | Json[] | { [key: string]: Json };

// <script type="application/ld+json"> blocks, parsed; broken ones are skipped.
function jsonLdBlocks(html: string): Json[] {
  const blocks: Json[] = [];
  const re = /<script[^>]*type\s*=\s*["']?application\/ld\+json["']?[^>]*>([\s\S]*?)<\/script>/gi;
  for (const match of html.matchAll(re)) {
    try {
      blocks.push(JSON.parse(match[1].trim()) as Json);
    } catch {
      // Some sites ship invalid JSON-LD; ignore that block.
    }
  }
  return blocks;
}

function isRecipe(node: { [key: string]: Json }): boolean {
  const type = node["@type"];
  return type === "Recipe" || (Array.isArray(type) && type.includes("Recipe"));
}

// Finds the first Recipe object anywhere: top level, arrays, or @graph.
function findRecipe(node: Json, depth = 0): { [key: string]: Json } | null {
  if (depth > 6 || node === null || typeof node !== "object") return null;
  if (Array.isArray(node)) {
    for (const item of node) {
      const found = findRecipe(item, depth + 1);
      if (found) return found;
    }
    return null;
  }
  if (isRecipe(node)) return node;
  for (const key of ["@graph", "mainEntity", "itemListElement"]) {
    if (key in node) {
      const found = findRecipe(node[key], depth + 1);
      if (found) return found;
    }
  }
  return null;
}

const ENTITIES: Record<string, string> = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", frac12: "½", frac14: "¼", frac34: "¾", deg: "°",
};

// JSON-LD text often still carries HTML tags and entities.
export function cleanText(value: Json | undefined): string {
  if (typeof value !== "string") return "";
  return value
    // Block tags separate words; inline ones (<b>, <a>) sit inside them.
    .replace(/<\/?(?:p|br|div|li|ul|ol|h[1-6]|tr|td)\b[^>]*>/gi, " ")
    .replace(/<[^>]*>/g, "")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&([a-z]+\d*);/gi, (m, name: string) => ENTITIES[name.toLowerCase()] ?? m)
    .replace(/\s+/g, " ")
    .trim();
}

// ISO 8601 durations: "PT1H30M" -> 90, "P0DT45M" -> 45.
export function parseDuration(value: Json | undefined): number | null {
  if (typeof value !== "string") return null;
  const m = value.match(/^P(?:(\d+)D)?(?:T(?:(\d+(?:\.\d+)?)H)?(?:(\d+(?:\.\d+)?)M)?(?:\d+(?:\.\d+)?S)?)?$/i);
  if (!m) return null;
  const minutes = Number(m[1] ?? 0) * 1440 + Number(m[2] ?? 0) * 60 + Number(m[3] ?? 0);
  return minutes > 0 && minutes <= 1440 ? Math.round(minutes) : null;
}

// "4 servings", 4, ["4", "4 servings"] -> 4
function parseServings(value: Json | undefined): number | null {
  const first = Array.isArray(value) ? value[0] : value;
  const n = typeof first === "number" ? first : Number(String(first ?? "").match(/\d+/)?.[0]);
  return Number.isInteger(n) && n >= 1 && n <= 100 ? n : null;
}

function asList(value: Json | undefined): Json[] {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
}

// "1. Preheat to 375. 2. Bake." -> ["Preheat to 375.", "Bake."]. Splits only at
// the next expected number, so "375." inside a step stays put.
export function splitNumbered(text: string): string[] {
  const trimmed = text.trim();
  if (!/^1\.\s/.test(trimmed)) return [trimmed];
  const parts: string[] = [];
  let rest = trimmed.replace(/^1\.\s+/, "");
  for (let n = 2; ; n++) {
    const at = rest.search(new RegExp(`\\s${n}\\.\\s`));
    if (at === -1) break;
    parts.push(rest.slice(0, at).trim());
    rest = rest.slice(at).trim().replace(new RegExp(`^${n}\\.\\s+`), "");
  }
  parts.push(rest.trim());
  return parts;
}

// Instructions come as one string, a list of strings, HowToStep objects, or
// HowToSection objects that contain steps.
function parseSteps(value: Json | undefined): string[] {
  const steps: string[] = [];
  const walk = (node: Json) => {
    if (typeof node === "string") {
      node
        .split(/\n+/)
        .flatMap(splitNumbered)
        .map(cleanText)
        .filter(Boolean)
        .forEach((s) => steps.push(s));
      return;
    }
    if (Array.isArray(node)) return node.forEach(walk);
    if (node && typeof node === "object") {
      if ("itemListElement" in node) return walk(node.itemListElement);
      const text = cleanText(node.text) || cleanText(node.name);
      if (text) steps.push(text);
    }
  };
  walk(value ?? null);
  return steps;
}

// Category and cuisine first; sites stuff "keywords" with SEO terms, so those
// only fill the remaining slots.
const MAX_IMPORTED_TAGS = 5;

function parseTags(recipe: { [key: string]: Json }): string[] {
  const raw = [...asList(recipe.recipeCategory), ...asList(recipe.recipeCuisine), ...asList(recipe.keywords)]
    .flatMap((v) => (typeof v === "string" ? v.split(",") : []))
    .map((t) => slugify(cleanText(t)))
    .filter((t) => t && t.length <= 30);
  return [...new Set(raw)].slice(0, MAX_IMPORTED_TAGS);
}

export function extractRecipe(html: string): ImportedRecipe | null {
  let recipe: { [key: string]: Json } | null = null;
  for (const block of jsonLdBlocks(html)) {
    recipe = findRecipe(block);
    if (recipe) break;
  }
  if (!recipe) return null;

  const ingredients = asList(recipe.recipeIngredient ?? recipe.ingredients).map(cleanText).filter(Boolean);
  const steps = parseSteps(recipe.recipeInstructions);
  const title = cleanText(recipe.name);
  if (!title || (ingredients.length === 0 && steps.length === 0)) return null;

  return {
    title: title.slice(0, 200),
    intro: cleanText(recipe.description).slice(0, 2000),
    prepMin: parseDuration(recipe.prepTime),
    cookMin: parseDuration(recipe.cookTime) ?? (recipe.prepTime ? null : parseDuration(recipe.totalTime)),
    servings: parseServings(recipe.recipeYield),
    tags: parseTags(recipe),
    ingredients: ingredients.slice(0, 100).map((i) => i.slice(0, 200)),
    steps: steps.slice(0, 100).map((s) => s.slice(0, 2000)),
  };
}

// The imported recipe as recipe-form text, ready to check and save.
export function importToFormValues(recipe: ImportedRecipe): RecipeFormValues {
  const num = (n: number | null) => (n == null ? "" : String(n));
  return {
    ...EMPTY_RECIPE,
    title: recipe.title,
    intro: recipe.intro,
    prep_min: num(recipe.prepMin),
    cook_min: num(recipe.cookMin),
    servings: num(recipe.servings),
    tags: recipe.tags.join(", "),
    ingredients: recipe.ingredients.join("\n"),
    steps: recipe.steps.join("\n"),
  };
}
