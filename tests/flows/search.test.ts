import { beforeEach, describe, expect, it, vi } from "vitest";
import { fakeSupabase, type Call, type Result } from "../fake-supabase";

const supabase = vi.hoisted(() => ({ current: null as unknown }));
vi.mock("@/lib/supabase/public", () => ({ createPublicClient: () => supabase.current }));

import { cleanQuery, searchPosts } from "@/lib/search";

const ROWS = [
  { kind: "recipe", id: "r1", title: "Mango Cheesecake", slug: "mango-cheesecake", summary: "No-bake.", photo_url: null, place_name: null, my_rating: null, tags: ["dessert"], published_at: "2026-09-29T00:00:00Z" },
  { kind: "review", id: "v1", title: "Best tacos", slug: "best-tacos", summary: "Crispy.", photo_url: null, place_name: "Joe's Tacos", my_rating: 4, tags: null, published_at: "2026-09-28T00:00:00Z" },
  { kind: "blog", id: "b1", title: "Mango season", slug: "mango-season", summary: "It's here.", photo_url: null, place_name: null, my_rating: null, tags: ["fruit"], published_at: "2026-09-27T00:00:00Z" },
];

let fake: ReturnType<typeof fakeSupabase>;
let rpcResult: Result;

beforeEach(() => {
  rpcResult = { data: ROWS };
  fake = fakeSupabase((call: Call) => (call.rpc === "search_posts" ? rpcResult : { data: null }));
  supabase.current = fake.client;
});

describe("search results", () => {
  it("searches all three post types and links each to the right page", async () => {
    const results = await searchPosts("  mango   cheesecake ");

    expect(fake.calls).toHaveLength(1);
    expect(fake.calls[0]).toMatchObject({ rpc: "search_posts", payload: { p_query: "mango cheesecake", p_limit: 30 } });
    expect(results.map((r) => r.href)).toEqual([
      "/recipes/mango-cheesecake",
      "/reviews/best-tacos",
      "/blog/mango-season",
    ]);
    expect(results[1]).toMatchObject({ place_name: "Joe's Tacos", my_rating: 4, tags: [] }); // null tags -> []
  });

  it("doesn't query the database for empty or one-letter searches", async () => {
    expect(await searchPosts("")).toEqual([]);
    expect(await searchPosts(" m ")).toEqual([]);
    expect(await searchPosts(undefined)).toEqual([]);
    expect(await searchPosts(["mango", "x"])).toEqual([]); // ?q=a&q=b arrives as an array
    expect(fake.calls).toHaveLength(0);
  });

  it("caps very long queries at 100 characters", async () => {
    await searchPosts("a".repeat(500));
    expect((fake.calls[0].payload as { p_query: string }).p_query).toHaveLength(100);
  });

  it("passes SQL-looking text through as a parameter, never as SQL", async () => {
    await searchPosts("'; drop table recipes; --");
    expect((fake.calls[0].payload as { p_query: string }).p_query).toBe("'; drop table recipes; --");
  });

  it("returns no results (instead of an error page) before the search migration runs", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    rpcResult = { error: { code: "PGRST202", message: "Could not find the function" } };
    expect(await searchPosts("mango")).toEqual([]);
  });

  it("surfaces other database errors", async () => {
    rpcResult = { error: { code: "57014", message: "statement timeout" } };
    await expect(searchPosts("mango")).rejects.toMatchObject({ message: "statement timeout" });
  });
});

describe("cleanQuery", () => {
  it("trims and collapses whitespace", () => {
    expect(cleanQuery("  hot\n\tsauce  ")).toBe("hot sauce");
    expect(cleanQuery(42)).toBe("");
  });
});
