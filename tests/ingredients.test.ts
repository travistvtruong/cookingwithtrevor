import { describe, expect, it } from "vitest";
import { formatIngredient, formatQuantity, parseIngredient } from "@/lib/ingredients";

describe("parseIngredient", () => {
  it.each([
    ["1 1/2 cups flour", { quantity: 1.5, unit: "cup", name: "flour" }],
    ["½ tsp salt", { quantity: 0.5, unit: "tsp", name: "salt" }],
    ["1½ Tablespoons olive oil", { quantity: 1.5, unit: "tbsp", name: "olive oil" }],
    ["3 eggs", { quantity: 3, unit: null, name: "eggs" }],
    ["2 large eggs", { quantity: 2, unit: null, name: "large eggs" }],
    ["salt to taste", { quantity: null, unit: null, name: "salt to taste" }],
    ["- 2 cloves garlic, minced", { quantity: 2, unit: "clove", name: "garlic, minced" }],
    ["1 can of tomatoes", { quantity: 1, unit: "can", name: "tomatoes" }],
    ["250 g spaghetti", { quantity: 250, unit: "g", name: "spaghetti" }],
    ["0.5 lb ground beef", { quantity: 0.5, unit: "lb", name: "ground beef" }],
  ])("parses %j", (line, expected) => {
    expect(parseIngredient(line)).toEqual(expected);
  });

  it("keeps ranges as written with no quantity, so they never merge wrongly", () => {
    expect(parseIngredient("2-3 sprigs thyme")).toEqual({ quantity: null, unit: null, name: "2-3 sprigs thyme" });
    expect(parseIngredient("2 to 3 cloves garlic")).toEqual({ quantity: null, unit: null, name: "2 to 3 cloves garlic" });
  });
});

describe("formatQuantity", () => {
  it.each([
    [1, "1"],
    [0.5, "1/2"],
    [1.5, "1 1/2"],
    [0.333, "1/3"],
    [2.75, "2 3/4"],
    [0.3, "0.3"],
    [1.999, "2"],
  ])("formats %d as %s", (value, expected) => {
    expect(formatQuantity(value)).toBe(expected);
  });
});

describe("formatIngredient", () => {
  it("pluralizes units above one and round-trips with the parser", () => {
    expect(formatIngredient({ quantity: 2, unit: "cup", name: "milk" })).toBe("2 cups milk");
    expect(formatIngredient({ quantity: 1, unit: "cup", name: "milk" })).toBe("1 cup milk");
    expect(formatIngredient({ quantity: null, unit: null, name: "salt to taste" })).toBe("salt to taste");
    const line = "1 1/2 cups flour";
    expect(formatIngredient(parseIngredient(line))).toBe(line);
  });
});
