import { describe, expect, it } from "vitest";
import { groupBySection, sectionFor } from "@/lib/store-sections";

const section = (name: string, unit: string | null = null) => sectionFor({ name, unit });

describe("store sections", () => {
  it.each([
    ["tomatoes", "Produce"],
    ["garlic", "Produce"],
    ["fresh basil", "Produce"],
    ["red pepper", "Produce"],
    ["eggplant", "Produce"],
    ["green beans", "Produce"],
    ["lemon juice", "Produce"],
    ["eggs", "Dairy & eggs"],
    ["butter, softened", "Dairy & eggs"],
    ["fresh mozzarella", "Dairy & eggs"],
    ["sour cream", "Dairy & eggs"],
    ["chicken thighs", "Meat & seafood"],
    ["ground beef", "Meat & seafood"],
    ["shrimp (peeled)", "Meat & seafood"],
    ["flour tortillas", "Bakery"],
    ["hamburger buns", "Bakery"],
    ["frozen peas", "Frozen"],
    ["vanilla ice cream", "Frozen"],
    ["peanut butter", "Pantry"],
    ["coconut milk", "Pantry"],
    ["chicken broth", "Pantry"],
    ["tomato paste", "Pantry"],
    ["olive oil", "Pantry"],
    ["spaghetti", "Pantry"],
    ["all-purpose flour", "Baking"],
    ["brown sugar", "Baking"],
    ["baking soda", "Baking"],
    ["chocolate chips", "Baking"],
    ["salt", "Spices"],
    ["black pepper", "Spices"],
    ["salt and pepper", "Spices"],
    ["garlic powder", "Spices"],
    ["red pepper flakes", "Spices"],
    ["ground cinnamon", "Spices"],
    ["dry white wine", "Drinks"],
    ["dragon fruit", "Other"],
  ])("%s -> %s", (name, expected) => {
    expect(section(name)).toBe(expected);
  });

  it("puts canned goods on the canned aisle", () => {
    expect(section("diced tomatoes", "can")).toBe("Pantry");
    expect(section("black beans", "can")).toBe("Pantry");
    expect(section("tuna", "can")).toBe("Pantry");
  });

  it("groups in store order and keeps the order within a section", () => {
    const items = [
      { name: "salt", unit: null },
      { name: "onion", unit: null },
      { name: "milk", unit: "cup" },
      { name: "carrots", unit: null },
    ];
    expect(groupBySection(items).map((g) => [g.section, g.items.map((i) => i.name)])).toEqual([
      ["Produce", ["onion", "carrots"]],
      ["Dairy & eggs", ["milk"]],
      ["Spices", ["salt"]],
    ]);
  });
});
