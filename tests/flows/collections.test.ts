import { beforeEach, describe, expect, it, vi } from "vitest";
import { RedirectSignal, fakeSupabase, type Call, type Result } from "../fake-supabase";

const supabase = vi.hoisted(() => ({ current: null as unknown }));
const revalidatePath = vi.hoisted(() => vi.fn());
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => supabase.current }));
vi.mock("next/cache", () => ({ revalidatePath }));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new RedirectSignal(url);
  },
}));

import {
  createCollection,
  deleteCollection,
  renameCollection,
  setInCollection,
} from "@/app/library/collection-actions";

function form(name: string) {
  const fd = new FormData();
  fd.set("name", name);
  return fd;
}

let fake: ReturnType<typeof fakeSupabase>;
let collectionsResult: Result;
let linkResult: Result;

beforeEach(() => {
  collectionsResult = { data: [{ id: "col-1" }] };
  linkResult = { data: null };
  revalidatePath.mockClear();
  fake = fakeSupabase((call: Call) => {
    if (call.table === "collections") return collectionsResult;
    if (call.table === "collection_recipes") return linkResult;
    return { data: null };
  });
  supabase.current = fake.client;
});

const op = (table: string, kind: Call["op"]) => fake.calls.find((c) => c.table === table && c.op === kind);

describe("add a recipe to a collection", () => {
  it("adds a library recipe to an existing collection", async () => {
    expect(await setInCollection("col-1", "recipe-1", true)).toEqual({});
    expect(op("collection_recipes", "insert")?.payload).toEqual({ collection_id: "col-1", recipe_id: "recipe-1" });
    expect(revalidatePath).toHaveBeenCalledWith("/library", "layout");
  });

  it("creates a new collection and adds the recipe in one go", async () => {
    const result = await createCollection("recipe-1", {}, form("  Weeknight   dinners "));

    expect(op("collections", "insert")?.payload).toEqual({ name: "Weeknight dinners" }); // owner set by the DB
    expect(op("collection_recipes", "insert")?.payload).toEqual({ collection_id: "col-1", recipe_id: "recipe-1" });
    expect(result).toEqual({ message: "Added to “Weeknight dinners”." });
  });

  it("treats adding a recipe that's already there as success", async () => {
    linkResult = { error: { code: "23505", message: "duplicate key" } };
    expect(await setInCollection("col-1", "recipe-1", true)).toEqual({});
  });

  it("explains a refusal (recipe not in your library, or not your collection)", async () => {
    linkResult = { error: { code: "42501", message: "new row violates row-level security policy" } };
    const result = await setInCollection("someone-elses", "recipe-1", true);
    expect(result.error).toMatch(/still in your library/);
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("removes a recipe from a collection", async () => {
    await setInCollection("col-1", "recipe-1", false);
    const del = op("collection_recipes", "delete");
    expect(del?.filters).toEqual(expect.arrayContaining([["eq", "collection_id", "col-1"], ["eq", "recipe_id", "recipe-1"]]));
  });
});

describe("manage collections", () => {
  it("validates names", async () => {
    expect(await createCollection(null, {}, form("   "))).toEqual({ error: "Give the collection a name." });
    expect((await createCollection(null, {}, form("x".repeat(61)))).error).toMatch(/under 60/);
    expect(fake.calls).toHaveLength(0);
  });

  it("reports duplicate names and the 50-collection limit", async () => {
    collectionsResult = { error: { code: "23505", message: "duplicate" } };
    expect(await createCollection(null, {}, form("Desserts"))).toEqual({
      error: "You already have a collection with that name.",
    });
    collectionsResult = { error: { code: "P0001", message: "You can have up to 50 collections." } };
    expect(await createCollection(null, {}, form("One more"))).toEqual({ error: "You can have up to 50 collections." });
  });

  it("renames only your own collection", async () => {
    expect(await renameCollection("col-1", {}, form("Sunday baking"))).toEqual({ message: "Renamed." });
    const upd = op("collections", "update");
    expect(upd?.payload).toEqual({ name: "Sunday baking" });
    expect(upd?.filters).toEqual(expect.arrayContaining([["eq", "user_id", "user-1"]]));

    collectionsResult = { data: [] }; // RLS matched nothing
    expect(await renameCollection("someone-elses", {}, form("Mine now"))).toEqual({
      error: "Could not rename the collection.",
    });
  });

  it("deletes a collection and returns to the library", async () => {
    await expect(deleteCollection("col-1")).rejects.toMatchObject({ url: "/library" });
    collectionsResult = { data: [] };
    expect(await deleteCollection("someone-elses")).toEqual({ error: "Could not delete the collection." });
  });
});
