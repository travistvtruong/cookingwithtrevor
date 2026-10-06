import { describe, expect, it } from "vitest";
import { formatIngredient } from "@/lib/ingredients";
import { relatedPosts } from "@/lib/related";
import { clampServings, plural, scaleIngredients, singular } from "@/lib/scale";
import { pinterestUrl, shareImageUrl } from "@/lib/share";
import { countTags, isTag, tagLabel, tagPath } from "@/lib/tags";

const ing = (quantity: number | null, unit: string | null, name: string) => ({ quantity, unit, name });
const scaled = (items: ReturnType<typeof ing>[], factor: number) =>
  scaleIngredients(items, factor).map(formatIngredient);

describe("serving scaler", () => {
  it("multiplies measured ingredients and leaves the rest alone", () => {
    expect(scaled([ing(1.5, "cup", "flour"), ing(0.25, "tsp", "salt"), ing(null, null, "butter for the pan")], 2)).toEqual([
      "3 cups flour",
      "1/2 tsp salt",
      "butter for the pan",
    ]);
  });

  it("halves into kitchen fractions", () => {
    expect(scaled([ing(1, "cup", "milk"), ing(0.75, "cup", "sugar")], 0.5)).toEqual(["1/2 cup milk", "3/8 cup sugar"]);
  });

  it("returns the same list at 1x", () => {
    const list = [ing(2, null, "eggs")];
    expect(scaleIngredients(list, 1)).toBe(list);
  });

  it("rewords counted items that cross one", () => {
    expect(scaled([ing(2, null, "eggs")], 0.5)).toEqual(["1 egg"]);
    expect(scaled([ing(1, null, "egg")], 3)).toEqual(["3 eggs"]);
    expect(scaled([ing(1, null, "onion, diced")], 2)).toEqual(["2 onions, diced"]);
    expect(scaled([ing(4, null, "large tomatoes (ripe)")], 0.25)).toEqual(["1 large tomato (ripe)"]);
    // Measured items keep their name: the unit carries the plural.
    expect(scaled([ing(1, "cup", "blueberries")], 2)).toEqual(["2 cups blueberries"]);
  });

  it("knows common plural spellings", () => {
    expect([singular("berries"), singular("peaches"), singular("eggs"), singular("molasses")]).toEqual([
      "berry",
      "peach",
      "egg",
      "molasses",
    ]);
    expect([plural("berry"), plural("potato"), plural("peach"), plural("egg"), plural("molasses")]).toEqual([
      "berries",
      "potatoes",
      "peaches",
      "eggs",
      "molasses",
    ]);
  });

  it("keeps servings between 1 and 100", () => {
    expect([clampServings(0), clampServings(4.4), clampServings(500)]).toEqual([1, 4, 100]);
  });
});

describe("tags", () => {
  it("builds paths and labels from tag slugs", () => {
    expect(tagPath("weeknight-dinner")).toBe("/tags/weeknight-dinner");
    expect(tagLabel("weeknight-dinner")).toBe("weeknight dinner");
  });

  it("only accepts real tag slugs", () => {
    expect(isTag("ice-cream")).toBe(true);
    expect(isTag("Ice Cream")).toBe(false);
    expect(isTag("")).toBe(false);
    expect(isTag("drop%20table")).toBe(false);
  });

  it("counts tags, most used first", () => {
    expect(countTags([{ tags: ["burger", "casual"] }, { tags: ["burger"] }, { tags: [] }])).toEqual([
      { tag: "burger", count: 2 },
      { tag: "casual", count: 1 },
    ]);
  });
});

describe("related posts", () => {
  const post = (id: string, tags: string[], published_at: string) => ({ id, tags, published_at });

  it("ranks by shared tags, then newest, and skips the current post", () => {
    const current = post("a", ["pasta", "quick"], "2026-10-01");
    const others = [
      current,
      post("b", ["soup"], "2026-10-04"),
      post("c", ["pasta"], "2026-09-01"),
      post("d", ["pasta", "quick"], "2026-08-01"),
      post("e", [], "2026-10-03"),
    ];
    expect(relatedPosts(current, others).map((p) => p.id)).toEqual(["d", "c", "b"]);
  });

  it("returns nothing when there are no other posts", () => {
    expect(relatedPosts(post("a", ["x"], "2026-10-01"), [post("a", ["x"], "2026-10-01")])).toEqual([]);
  });
});

describe("share links", () => {
  it("builds a Pinterest save link with the page, picture and title", () => {
    const url = new URL(pinterestUrl({ url: "https://site.test/recipes/pie", title: "Pie & cream", image: "https://img.test/p.jpg" }));
    expect(url.origin + url.pathname).toBe("https://www.pinterest.com/pin/create/button/");
    expect(Object.fromEntries(url.searchParams)).toEqual({
      url: "https://site.test/recipes/pie",
      media: "https://img.test/p.jpg",
      description: "Pie & cream",
    });
  });

  it("falls back to the default card when a post has no photo", () => {
    expect(shareImageUrl(null, "https://site.test")).toBe("https://site.test/opengraph-image");
    expect(shareImageUrl("https://img.test/p.jpg", "https://site.test")).toBe("https://img.test/p.jpg");
  });
});
