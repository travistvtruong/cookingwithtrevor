import { afterEach, describe, expect, it, vi } from "vitest";
import { safeNext } from "@/lib/safe-next";
import { siteUrl } from "@/lib/site-url";
import { slugify } from "@/lib/slugify";

describe("slugify", () => {
  it.each([
    ["Grandma's Chili (Spicy!)", "grandmas-chili-spicy"],
    ["Crème Brûlée", "creme-brulee"],
    ["  Mango   Cheesecake  ", "mango-cheesecake"],
    ["!!!", ""],
  ])("%j -> %j", (input, expected) => expect(slugify(input)).toBe(expected));

  it("caps length at 100 without a trailing dash", () => {
    const slug = slugify("word ".repeat(40));
    expect(slug.length).toBeLessThanOrEqual(100);
    expect(slug.endsWith("-")).toBe(false);
  });
});

describe("safeNext (post-login redirect)", () => {
  it("allows same-site paths", () => {
    expect(safeNext("/library")).toBe("/library");
    expect(safeNext("/recipes/mango?x=1")).toBe("/recipes/mango?x=1");
  });

  it.each(["https://evil.example", "//evil.example", "/\\evil.example", "library", null, undefined, 42])(
    "rejects %j (open-redirect protection)",
    (value) => expect(safeNext(value)).toBe("/"),
  );
});

describe("siteUrl", () => {
  afterEach(() => vi.unstubAllEnvs());

  it.each([
    ["https://cookingwithtrevor.vercel.app", "https://cookingwithtrevor.vercel.app"],
    ["cookingwithtrevor.vercel.app", "https://cookingwithtrevor.vercel.app"],
    ['"https://cookingwithtrevor.vercel.app/"', "https://cookingwithtrevor.vercel.app"],
    [" https://cookingwithtrevor.vercel.app/ ", "https://cookingwithtrevor.vercel.app"],
    ["localhost:3000", "http://localhost:3000"],
  ])("normalizes %j", (value, expected) => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", value);
    expect(siteUrl()).toBe(expected);
  });

  it("falls back to Vercel's production URL, then localhost, instead of throwing", () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "not a url at all");
    vi.stubEnv("NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL", "cookingwithtrevor.vercel.app");
    expect(siteUrl()).toBe("https://cookingwithtrevor.vercel.app");

    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL", "");
    expect(siteUrl()).toBe("http://localhost:3000");
  });
});
