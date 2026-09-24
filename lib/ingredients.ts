// Parse and format ingredient lines like "1 1/2 cups flour" <-> { quantity, unit, name }.
// Units are normalized so the grocery list can merge matching items.

export type Ingredient = {
  quantity: number | null;
  unit: string | null;
  name: string;
};

const UNIT_ALIASES: Record<string, string> = {
  cup: "cup", cups: "cup", c: "cup",
  tablespoon: "tbsp", tablespoons: "tbsp", tbsp: "tbsp", tbs: "tbsp", tbl: "tbsp",
  teaspoon: "tsp", teaspoons: "tsp", tsp: "tsp",
  gram: "g", grams: "g", g: "g",
  kilogram: "kg", kilograms: "kg", kg: "kg",
  milliliter: "ml", milliliters: "ml", millilitre: "ml", millilitres: "ml", ml: "ml",
  liter: "l", liters: "l", litre: "l", litres: "l", l: "l",
  ounce: "oz", ounces: "oz", oz: "oz",
  pound: "lb", pounds: "lb", lb: "lb", lbs: "lb",
  clove: "clove", cloves: "clove",
  can: "can", cans: "can",
  pinch: "pinch", pinches: "pinch",
  slice: "slice", slices: "slice",
  stick: "stick", sticks: "stick",
  bunch: "bunch", bunches: "bunch",
  package: "package", packages: "package", pkg: "package",
};

// Units that read better pluralized when quantity > 1.
const PLURAL_UNITS: Record<string, string> = {
  cup: "cups", clove: "cloves", can: "cans", pinch: "pinches", slice: "slices",
  stick: "sticks", bunch: "bunches", package: "packages",
};

const UNICODE_FRACTIONS: Record<string, string> = {
  "½": "1/2", "⅓": "1/3", "⅔": "2/3", "¼": "1/4", "¾": "3/4",
  "⅕": "1/5", "⅛": "1/8", "⅜": "3/8", "⅝": "5/8", "⅞": "7/8",
};

// "1", "1.5", "1/2", "1 1/2" at the start of the line.
const QUANTITY_RE = /^(\d+\s+\d+\/\d+|\d+\/\d+|\d+(?:\.\d+)?)\s*/;

function parseNumber(text: string): number | null {
  const parts = text.trim().split(/\s+/);
  let total = 0;
  for (const part of parts) {
    if (part.includes("/")) {
      const [num, den] = part.split("/").map(Number);
      if (!den) return null;
      total += num / den;
    } else {
      total += Number(part);
    }
  }
  return Number.isFinite(total) && total > 0 ? total : null;
}

export function parseIngredient(line: string): Ingredient {
  let text = line.trim().replace(/^[-*•]\s*/, "");
  // "1½" -> "1 1/2", "½" -> "1/2"
  text = text.replace(/(\d)?([½⅓⅔¼¾⅕⅛⅜⅝⅞])/g, (_, whole, frac) =>
    whole ? `${whole} ${UNICODE_FRACTIONS[frac]}` : UNICODE_FRACTIONS[frac],
  );

  let quantity: number | null = null;
  const qMatch = text.match(QUANTITY_RE);
  // Ranges like "2-3 sprigs" have no single quantity; keep the line as written.
  if (qMatch && !/^[-–]\s*\d|^to\s+\d/.test(text.slice(qMatch[0].length))) {
    quantity = parseNumber(qMatch[1]);
    if (quantity !== null) text = text.slice(qMatch[0].length);
  }

  let unit: string | null = null;
  if (quantity !== null) {
    const uMatch = text.match(/^([a-zA-Z]+)\.?\s+/);
    const normalized = uMatch && UNIT_ALIASES[uMatch[1].toLowerCase()];
    if (normalized) {
      unit = normalized;
      text = text.slice(uMatch[0].length);
    }
  }

  return { quantity, unit, name: text.replace(/^of\s+/i, "").trim() };
}

const FRACTIONS: [number, string][] = [
  [1 / 8, "1/8"], [1 / 4, "1/4"], [1 / 3, "1/3"], [3 / 8, "3/8"], [1 / 2, "1/2"],
  [5 / 8, "5/8"], [2 / 3, "2/3"], [3 / 4, "3/4"], [7 / 8, "7/8"],
];

export function formatQuantity(value: number): string {
  const whole = Math.floor(value);
  const rest = value - whole;
  if (rest < 0.02) return String(whole);
  if (rest > 0.98) return String(whole + 1);

  const match = FRACTIONS.find(([f]) => Math.abs(f - rest) < 0.02);
  if (!match) return String(Math.round(value * 100) / 100);
  return whole ? `${whole} ${match[1]}` : match[1];
}

export function formatIngredient({ quantity, unit, name }: Ingredient): string {
  if (quantity === null) return name;
  const unitText = unit ? (quantity > 1 && PLURAL_UNITS[unit]) || unit : null;
  return [formatQuantity(quantity), unitText, name].filter(Boolean).join(" ");
}
