import type { Ingredient } from "@/lib/ingredients";

// Combine ingredients from several recipes into one shopping list.
// v1 rule (PRD): only merge items with the same name AND the same unit,
// so "2 cups milk" + "250 ml milk" stay as two lines.

export type GroceryItem = Ingredient;

// "Garlic, minced" -> "garlic"; "fresh basil (packed)" -> "fresh basil"
function baseName(name: string): string {
  return name
    .replace(/\([^)]*\)/g, "")
    .split(",")[0]
    .replace(/\s+/g, " ")
    .trim();
}

// Loose singular form used only for matching: "eggs"/"egg", "tomatoes"/"tomato", "berries"/"berry".
function matchKey(name: string): string {
  return baseName(name)
    .toLowerCase()
    .split(" ")
    .map((word) => {
      if (word.endsWith("ies") && word.length > 4) return `${word.slice(0, -3)}y`;
      if (word.endsWith("oes")) return word.slice(0, -2);
      if (word.endsWith("s") && !word.endsWith("ss") && word.length > 3) return word.slice(0, -1);
      return word;
    })
    .join(" ");
}

export function mergeIngredients(ingredients: Ingredient[]): GroceryItem[] {
  const merged = new Map<string, GroceryItem & { plural?: string }>();

  for (const ing of ingredients) {
    const name = baseName(ing.name);
    if (!name) continue;
    // Items without an amount ("salt to taste") merge with each other by name.
    const key = `${matchKey(name)}|${ing.unit ?? ""}|${ing.quantity === null ? "none" : "qty"}`;
    const isPlural = matchKey(name) !== name.toLowerCase();
    const existing = merged.get(key);

    if (!existing) {
      merged.set(key, { name, unit: ing.unit, quantity: ing.quantity, plural: isPlural ? name : undefined });
      continue;
    }
    if (isPlural) existing.plural ??= name;
    if (existing.quantity !== null && ing.quantity !== null) {
      // Round away floating-point noise (0.1 + 0.2).
      existing.quantity = Math.round((existing.quantity + ing.quantity) * 1000) / 1000;
    }
  }

  return [...merged.values()]
    .map(({ plural, ...item }) => ({
      ...item,
      // "3 tomatoes", not "3 tomato", when a recipe spelled it that way.
      name: !item.unit && (item.quantity ?? 0) > 1 && plural ? plural : item.name,
    }))
    .sort((a, b) => matchKey(a.name).localeCompare(matchKey(b.name), "en"));
}
