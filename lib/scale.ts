import type { Ingredient } from "@/lib/ingredients";

// Serving-size scaler (R9): multiply every measured ingredient by the same
// factor. Lines without an amount ("salt to taste") stay as written.
export function scaleIngredients<T extends Ingredient>(ingredients: T[], factor: number): T[] {
  if (factor === 1) return ingredients;
  return ingredients.map((ing) => {
    if (ing.quantity === null) return ing;
    const quantity = Math.round(ing.quantity * factor * 1000) / 1000;
    // Counted items change wording when they cross one: "2 eggs" -> "1 egg".
    let name = ing.name;
    if (!ing.unit && ing.quantity > 1 && quantity <= 1) name = changeHeadNoun(name, singular);
    if (!ing.unit && ing.quantity <= 1 && quantity > 1) name = changeHeadNoun(name, plural);
    return { ...ing, quantity, name };
  });
}

// The noun is the last word before any comma or bracket:
// "large eggs, beaten" -> "eggs".
function changeHeadNoun(name: string, change: (word: string) => string): string {
  const match = name.match(/^([^,(]*?)([A-Za-z]+)(\s*(?:[,(].*)?)$/);
  if (!match) return name;
  const [, before, word, after] = match;
  return `${before}${change(word)}${after}`;
}

export function singular(word: string): string {
  if (/(ss|sses)$/i.test(word)) return word; // "molasses", "swiss"
  if (/[^aeiou]ies$/i.test(word)) return `${word.slice(0, -3)}y`; // berries
  if (/(oes|ches|shes|xes)$/i.test(word)) return word.slice(0, -2); // tomatoes, peaches
  if (/[^s]s$/i.test(word) && word.length > 3) return word.slice(0, -1); // eggs
  return word;
}

export function plural(word: string): string {
  if (/s$/i.test(word)) return word; // already plural, or "molasses"
  if (/[^aeiou]y$/i.test(word)) return `${word.slice(0, -1)}ies`; // berry
  if (/(o|ch|sh|x)$/i.test(word)) return `${word}es`; // tomato, peach
  return `${word}s`;
}

// Multipliers offered when a recipe doesn't say how many it serves.
export const MULTIPLIERS = [0.5, 1, 2, 3] as const;

export function multiplierLabel(m: number): string {
  return m === 0.5 ? "½×" : `${m}×`;
}

export const MIN_SERVINGS = 1;
export const MAX_SERVINGS = 100;

export function clampServings(n: number): number {
  return Math.min(MAX_SERVINGS, Math.max(MIN_SERVINGS, Math.round(n)));
}
