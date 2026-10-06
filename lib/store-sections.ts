// Grocery list grouped by store section (R10). Each item goes to the section
// whose keyword phrase matches the most words of its name, so "peanut butter"
// lands in Pantry rather than Dairy, and "garlic powder" in Spices rather than
// Produce. Sections are listed in a typical walk through a supermarket.

export const SECTIONS = [
  "Produce",
  "Bakery",
  "Meat & seafood",
  "Dairy & eggs",
  "Frozen",
  "Pantry",
  "Baking",
  "Spices",
  "Drinks",
  "Other",
] as const;

export type Section = (typeof SECTIONS)[number];

const KEYWORDS: Record<Exclude<Section, "Other">, string[]> = {
  Produce: [
    "apple", "apricot", "arugula", "asparagus", "avocado", "banana", "basil", "bean sprout", "beet",
    "bell pepper", "berry", "blackberry", "blueberry", "bok choy", "broccoli", "brussels sprout",
    "cabbage", "cantaloupe", "carrot", "cauliflower", "celery", "chard", "cherry", "chive", "cilantro",
    "clementine", "collard", "corn on the cob", "cranberry", "cucumber", "dill", "eggplant", "endive",
    "fennel", "fig", "garlic", "ginger", "grape", "grapefruit", "green bean", "green onion", "herb",
    "jalapeno", "jalapeño", "kale", "kiwi", "leek", "lemon", "lemongrass", "lettuce", "lime", "mango",
    "melon", "mint", "mushroom", "nectarine", "okra", "onion", "orange", "oregano leaves", "parsley",
    "parsnip", "pea pod", "peach", "pear", "red pepper", "green pepper", "yellow pepper", "persimmon", "pineapple", "plum", "pomegranate",
    "potato", "pumpkin", "radish", "raspberry", "romaine", "rosemary", "sage", "scallion", "shallot",
    "snap pea", "spinach", "squash", "strawberry", "sweet potato", "thyme", "tomatillo", "tomato",
    "turnip", "watermelon", "yam", "zucchini", "chili", "chile", "serrano", "poblano", "habanero",
  ],
  Bakery: [
    "bagel", "baguette", "bread", "brioche", "bun", "ciabatta", "croissant", "english muffin",
    "flatbread", "naan", "pita", "roll", "sourdough", "tortilla", "hamburger bun", "hot dog bun",
  ],
  "Meat & seafood": [
    "anchovy", "bacon", "beef", "brisket", "chicken", "chorizo", "clam", "cod", "crab", "duck",
    "fish", "ground beef", "ground pork", "ground turkey", "halibut", "ham", "lamb", "lobster",
    "mussel", "oyster", "pancetta", "pork", "prosciutto", "salami", "salmon", "sausage", "scallop",
    "shrimp", "steak", "tilapia", "tuna steak", "turkey", "veal", "chicken breast", "chicken thigh",
  ],
  "Dairy & eggs": [
    "butter", "buttermilk", "cheddar", "cheese", "cottage cheese", "cream", "cream cheese",
    "creme fraiche", "egg", "feta", "ghee", "goat cheese", "gouda", "greek yogurt", "half and half",
    "heavy cream", "milk", "mozzarella", "parmesan", "ricotta", "sour cream", "whipping cream",
    "yogurt", "provolone", "swiss cheese", "monterey jack", "brie", "mascarpone",
  ],
  Pantry: [
    "almond", "apple cider vinegar", "balsamic", "bean", "black bean", "breadcrumb", "broth",
    "canned", "cashew", "chickpea", "coconut milk", "couscous", "cracker", "dijon", "fish sauce",
    "hoisin", "hot sauce", "jam", "jelly", "ketchup", "kidney bean", "lentil", "macaroni", "mayo",
    "mayonnaise", "mirin", "mustard", "noodle", "nut", "oat", "oats", "oil", "olive", "olive oil",
    "panko", "pasta", "peanut", "peanut butter", "pecan", "penne", "pickle", "pine nut", "pistachio",
    "quinoa", "raisin", "rice", "rice vinegar", "salsa", "sesame oil", "soy sauce", "spaghetti",
    "sriracha", "stock", "tahini", "tomato paste", "tomato sauce", "crushed tomato", "diced tomato",
    "canned tomato", "tuna", "vegetable oil", "vinegar", "walnut", "worcestershire", "chicken broth",
    "chicken stock", "beef broth", "vegetable broth", "coconut cream", "lasagna", "ramen", "cereal",
    "granola", "barbecue sauce", "bbq sauce", "marinara", "pesto", "curry paste", "miso",
    "sun dried tomato", "evaporated milk", "condensed milk",
  ],
  Baking: [
    "baking powder", "baking soda", "brown sugar", "cake flour", "chocolate", "chocolate chip",
    "cocoa", "cornmeal", "cornstarch", "flour", "gelatin", "honey", "maple syrup", "molasses",
    "powdered sugar", "shortening", "sprinkle", "sugar", "vanilla", "vanilla extract", "yeast",
    "almond extract", "corn syrup", "icing sugar", "confectioners sugar", "graham cracker",
  ],
  Spices: [
    "allspice", "bay leaf", "black pepper", "cardamom", "cayenne", "chili flake", "chili powder",
    "cinnamon", "clove", "coriander", "cumin", "curry powder", "dried basil", "dried oregano",
    "dried thyme", "fennel seed", "garam masala", "garlic powder", "ginger powder", "ground ginger",
    "italian seasoning", "mustard seed", "nutmeg", "onion powder", "oregano", "paprika",
    "pepper flake", "peppercorn", "red pepper flake", "salt", "seasoning", "sesame seed",
    "smoked paprika", "spice", "turmeric", "kosher salt", "sea salt", "five spice", "za'atar",
    "everything bagel seasoning", "ground cumin", "ground cinnamon",
  ],
  Drinks: [
    "beer", "coffee", "espresso", "juice", "kombucha", "lemonade", "seltzer", "soda", "sparkling water",
    "tea", "wine", "whiskey", "rum", "vodka", "tequila", "bourbon", "orange juice",
  ],
  Frozen: ["ice cream", "sorbet", "popsicle", "frozen"],
};

// "Tomatoes, diced (fresh)" -> ["tomato", "diced"]: lower case, no brackets,
// loose singular per word, so keywords can be written in the singular.
function words(text: string): string[] {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\([^)]*\)/g, " ")
    .replace(/[^a-z' ]+/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => {
      if (/(ss|us)$/.test(w)) return w;
      if (/[^aeiou]ies$/.test(w)) return `${w.slice(0, -3)}y`;
      if (/(oes|ches|shes|xes)$/.test(w)) return w.slice(0, -2);
      if (/s$/.test(w) && w.length > 3) return w.slice(0, -1);
      return w;
    });
}

const PHRASES: { section: Section; words: string[] }[] = Object.entries(KEYWORDS).flatMap(([section, list]) =>
  list.map((phrase) => ({ section: section as Section, words: words(phrase) })),
);

function containsPhrase(haystack: string[], phrase: string[]): boolean {
  outer: for (let i = 0; i + phrase.length <= haystack.length; i++) {
    for (let j = 0; j < phrase.length; j++) if (haystack[i + j] !== phrase[j]) continue outer;
    return true;
  }
  return false;
}

export function sectionFor({ name, unit }: { name: string; unit: string | null }): Section {
  const w = words(name);
  if (w.includes("frozen")) return "Frozen";

  let best: { section: Section; length: number } | null = null;
  for (const phrase of PHRASES) {
    if (phrase.words.length === 0 || !containsPhrase(w, phrase.words)) continue;
    // Longer phrases are more specific; on a tie, the earlier section wins.
    if (!best || phrase.words.length > best.length) best = { section: phrase.section, length: phrase.words.length };
  }
  // Anything sold by the can is on the canned-goods aisle.
  if (unit === "can" && (!best || best.section === "Produce" || best.section === "Meat & seafood")) return "Pantry";
  return best?.section ?? "Other";
}

// Items grouped by section, in store order, keeping each section's item order.
export function groupBySection<T extends { name: string; unit: string | null }>(
  items: T[],
): { section: Section; items: T[] }[] {
  const groups = new Map<Section, T[]>();
  for (const item of items) {
    const section = sectionFor(item);
    groups.set(section, [...(groups.get(section) ?? []), item]);
  }
  return SECTIONS.filter((s) => groups.has(s)).map((section) => ({ section, items: groups.get(section)! }));
}
