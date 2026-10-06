import { beforeEach, describe, expect, it, vi } from "vitest";
import { RedirectSignal, fakeSupabase, type Call, type Result } from "../fake-supabase";

const supabase = vi.hoisted(() => ({ current: null as unknown }));
const page = vi.hoisted(() => ({ fetch: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => supabase.current }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new RedirectSignal(url);
  },
}));
vi.mock("@/lib/safe-fetch", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/safe-fetch")>()),
  fetchPublicHtml: page.fetch,
}));

import { saveMyRecipe } from "@/app/library/actions";
import { importRecipe } from "@/app/library/import-actions";
import { cleanText, extractRecipe, parseDuration, splitNumbered } from "@/lib/recipe-import";
import { FetchRefused, checkUrl, isPublicAddress } from "@/lib/safe-fetch";

const recipePage = (data: unknown) => `<html><head>
  <script type="application/ld+json">{ "@context": "https://schema.org", "@type": "WebSite", "name": "Food blog" }</script>
  <script type="application/ld+json">${JSON.stringify(data)}</script>
</head><body>…</body></html>`;

const PANCAKES = {
  "@context": "https://schema.org",
  "@graph": [
    { "@type": "WebPage", name: "Pancakes" },
    {
      "@type": ["Recipe", "NewsArticle"],
      name: "Fluffy Pancakes &amp; Syrup",
      description: "<p>Weekend <b>pancakes</b>.</p>",
      prepTime: "PT10M",
      cookTime: "PT1H5M",
      recipeYield: ["4", "4 servings"],
      keywords: "breakfast, Weekend Brunch",
      recipeCategory: "Breakfast",
      recipeIngredient: ["1 &frac12; cups flour", "2 eggs", "  "],
      recipeInstructions: [
        { "@type": "HowToSection", name: "Batter", itemListElement: [{ "@type": "HowToStep", text: "Whisk everything." }] },
        { "@type": "HowToStep", text: "Cook on a hot pan at 375&#176;F." },
      ],
      image: "https://example.com/photo.jpg",
    },
  ],
};

function form(fields: Record<string, string>) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
}

describe("reading recipe data from a page", () => {
  it("finds a Recipe inside @graph and cleans its text", () => {
    expect(extractRecipe(recipePage(PANCAKES))).toEqual({
      title: "Fluffy Pancakes & Syrup",
      intro: "Weekend pancakes.",
      prepMin: 10,
      cookMin: 65,
      servings: 4,
      tags: ["breakfast", "weekend-brunch"], // category first, duplicates dropped
      ingredients: ["1 ½ cups flour", "2 eggs"],
      steps: ["Whisk everything.", "Cook on a hot pan at 375°F."],
    });
  });

  it("reads instructions given as one block of text", () => {
    const recipe = extractRecipe(
      recipePage({ "@type": "Recipe", name: "Toast", recipeIngredient: ["bread"], recipeInstructions: "1. Heat to 375. Toast it. 2. Butter it." }),
    );
    expect(recipe?.steps).toEqual(["Heat to 375. Toast it.", "Butter it."]);
    expect(splitNumbered("Preheat to 375. Bake.")).toEqual(["Preheat to 375. Bake."]);
  });

  it("returns nothing when the page has no usable recipe", () => {
    expect(extractRecipe("<html><body>No data here</body></html>")).toBeNull();
    expect(extractRecipe(recipePage({ "@type": "Recipe", name: "Empty" }))).toBeNull();
    expect(extractRecipe('<script type="application/ld+json">{ broken json</script>')).toBeNull();
  });

  it("parses ISO 8601 durations and ignores nonsense", () => {
    expect([parseDuration("PT45M"), parseDuration("PT2H"), parseDuration("P0DT1H30M"), parseDuration("soon")]).toEqual([
      45, 120, 90, null,
    ]);
  });

  it("decodes entities and strips tags", () => {
    expect(cleanText("Mac &amp; cheese <em>(easy)</em> &#8211; done")).toBe("Mac & cheese (easy) – done");
  });
});

describe("which addresses may be fetched", () => {
  it.each([
    ["93.184.216.34", true],
    ["2606:4700::6810:85e5", true],
    ["127.0.0.1", false],
    ["10.1.2.3", false],
    ["172.20.0.1", false],
    ["192.168.1.1", false],
    ["169.254.169.254", false],
    ["100.64.0.1", false],
    ["0.0.0.0", false],
    ["::1", false],
    ["fd00::1", false],
    ["fe80::1", false],
    ["::ffff:127.0.0.1", false],
    ["not-an-ip", false],
  ])("%s public: %s", (ip, expected) => {
    expect(isPublicAddress(ip)).toBe(expected);
  });

  it("refuses other schemes, ports, credentials and local names", () => {
    for (const bad of ["ftp://example.com", "file:///etc/passwd", "http://example.com:8080/", "https://user:pw@example.com", "http://localhost/", "http://db.internal/", "not a url"]) {
      expect(() => checkUrl(bad)).toThrow(FetchRefused);
    }
    expect(checkUrl("https://example.com/recipe").hostname).toBe("example.com");
  });
});

describe("import and save", () => {
  let fake: ReturnType<typeof fakeSupabase>;
  let importsThisHour = 0;
  const rpc: Result = { data: { id: "recipe-9", slug: "fluffy-pancakes-abc123" } };

  beforeEach(() => {
    importsThisHour = 0;
    page.fetch.mockReset();
    fake = fakeSupabase((call: Call) => {
      if (call.table === "recipes" && call.op === "select") return { count: importsThisHour };
      if (call.rpc === "save_recipe") return rpc;
      return {};
    });
    supabase.current = fake.client;
  });

  it("fills the form from the page and remembers the final URL", async () => {
    page.fetch.mockResolvedValue({ html: recipePage(PANCAKES), finalUrl: "https://example.com/pancakes" });
    const state = await importRecipe({}, form({ url: "https://example.com/p" }));
    expect(page.fetch).toHaveBeenCalledWith("https://example.com/p");
    expect(state.error).toBeUndefined();
    expect(state.sourceUrl).toBe("https://example.com/pancakes");
    expect(state.values).toMatchObject({
      title: "Fluffy Pancakes & Syrup",
      servings: "4",
      ingredients: "1 ½ cups flour\n2 eggs",
      steps: "Whisk everything.\nCook on a hot pan at 375°F.",
      photo_url: "",
    });
  });

  it("shows the reason when a link can't be fetched", async () => {
    page.fetch.mockRejectedValue(new FetchRefused("That address isn't on the public internet."));
    expect((await importRecipe({}, form({ url: "http://10.0.0.1/" }))).error).toBe("That address isn't on the public internet.");
  });

  it("explains when a page has no recipe data", async () => {
    page.fetch.mockResolvedValue({ html: "<html></html>", finalUrl: "https://example.com/" });
    expect((await importRecipe({}, form({ url: "https://example.com/" }))).error).toMatch(/Couldn't find a recipe/);
  });

  it("stops after 20 imports in an hour, before fetching anything", async () => {
    importsThisHour = 20;
    expect((await importRecipe({}, form({ url: "https://example.com/" }))).error).toMatch(/last hour/);
    expect(page.fetch).not.toHaveBeenCalled();
    const countQuery = fake.calls.find((c) => c.table === "recipes");
    expect(countQuery?.filters).toEqual(
      expect.arrayContaining([["eq", "author_id", "user-1"], ["not", "source_url", "is", null]]),
    );
  });

  it("saves an import as a private recipe with its source link", async () => {
    await expect(
      saveMyRecipe(
        {},
        form({
          title: "Fluffy Pancakes",
          slug: "",
          intro: "",
          photo_url: "",
          prep_min: "10",
          cook_min: "",
          servings: "4",
          tags: "",
          ingredients: "2 eggs",
          steps: "Cook.",
          source_url: "https://example.com/pancakes",
        }),
      ),
    ).rejects.toMatchObject({ url: "/library/recipe-9" });
    expect(fake.calls).toContainEqual(
      expect.objectContaining({
        table: "recipes",
        op: "update",
        payload: { source_url: "https://example.com/pancakes" },
        filters: [["eq", "id", "recipe-9"], ["eq", "author_id", "user-1"]],
      }),
    );
  });

  it("ignores a source link that isn't http(s)", async () => {
    await expect(
      saveMyRecipe({}, form({ title: "X", ingredients: "1 egg", steps: "Cook.", source_url: "javascript:alert(1)" })),
    ).rejects.toBeInstanceOf(RedirectSignal);
    expect(fake.calls.some((c) => c.op === "update")).toBe(false);
  });
});
