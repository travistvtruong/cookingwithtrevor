import { describe, expect, it } from "vitest";
import { mergeIngredients } from "@/lib/grocery";
import { formatIngredient, parseIngredient } from "@/lib/ingredients";

const merge = (...lines: string[]) => mergeIngredients(lines.map(parseIngredient)).map(formatIngredient);

describe("mergeIngredients", () => {
  it("adds matching items with the same unit (2 eggs + 3 eggs = 5 eggs)", () => {
    expect(merge("2 eggs", "3 eggs")).toEqual(["5 eggs"]);
    expect(merge("1/2 cup sugar", "1/4 cup sugar")).toEqual(["3/4 cup sugar"]);
  });

  it("keeps different units on separate lines (PRD v1 rule)", () => {
    expect(merge("1 cup milk", "250 ml milk")).toEqual(["1 cup milk", "250 ml milk"]);
  });

  it("ignores prep notes, parentheses and simple plurals when matching", () => {
    expect(merge("2 cloves garlic, minced", "1 clove garlic")).toEqual(["3 cloves garlic"]);
    expect(merge("1 tomato", "2 tomatoes")).toEqual(["3 tomatoes"]);
    expect(merge("1 cup fresh basil (packed)")).toEqual(["1 cup fresh basil"]);
  });

  it("lists items without an amount once", () => {
    expect(merge("salt to taste", "salt to taste")).toEqual(["salt to taste"]);
  });

  it("avoids floating-point noise", () => {
    expect(mergeIngredients([
      { quantity: 0.1, unit: "cup", name: "oil" },
      { quantity: 0.2, unit: "cup", name: "oil" },
    ])[0].quantity).toBe(0.3);
  });

  it("sorts alphabetically and drops empty names", () => {
    expect(merge("1 onion", "2 apples", "  ")).toEqual(["2 apples", "1 onion"]);
  });
});
