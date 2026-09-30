import { beforeEach, describe, expect, it, vi } from "vitest";
import { RedirectSignal, fakeSupabase, type Call, type Result } from "../fake-supabase";

const supabase = vi.hoisted(() => ({ current: null as unknown }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => supabase.current }));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new RedirectSignal(url);
  },
  notFound: () => {
    throw new Error("NOT_FOUND");
  },
}));

import { createGroceryList, deleteGroceryList } from "@/app/grocery/actions";

function form(recipes: string[], name = "") {
  const fd = new FormData();
  for (const id of recipes) fd.append("recipe", id);
  fd.set("name", name);
  return fd;
}

const RECIPES: Record<string, { title: string; ingredients: { quantity: number | null; unit: string | null; name: string }[] }> = {
  a: {
    title: "Shakshuka",
    ingredients: [
      { quantity: 4, unit: null, name: "eggs" },
      { quantity: 2, unit: "clove", name: "garlic, minced" },
      { quantity: 1, unit: "can", name: "tomatoes" },
    ],
  },
  b: {
    title: "Frittata",
    ingredients: [
      { quantity: 6, unit: null, name: "eggs" },
      { quantity: 1, unit: "clove", name: "garlic" },
      { quantity: 1, unit: "cup", name: "milk" },
    ],
  },
  c: { title: "Pancakes", ingredients: [{ quantity: 250, unit: "ml", name: "milk" }] },
};

let fake: ReturnType<typeof fakeSupabase>;
let rpcResult: Result;

beforeEach(() => {
  rpcResult = { data: "list-1" };
  fake = fakeSupabase((call: Call) => {
    const ids = (call.filters.find(([f]) => f === "in")?.[2] as string[]) ?? [];
    if (call.table === "recipes") {
      return { data: ids.filter((id) => RECIPES[id]).map((id) => ({ id, title: RECIPES[id].title })) };
    }
    if (call.table === "ingredients") return { data: ids.flatMap((id) => RECIPES[id]?.ingredients ?? []) };
    if (call.rpc === "create_grocery_list") return rpcResult;
    return { data: null };
  });
  supabase.current = fake.client;
});

const created = () =>
  fake.calls.find((c) => c.rpc === "create_grocery_list")?.payload as {
    p_name: string;
    p_items: { quantity: number | null; unit: string | null; name: string }[];
  };

describe("generate a grocery list", () => {
  it("merges matching items across recipes and opens the new list", async () => {
    await expect(createGroceryList({}, form(["a", "b", "c"]))).rejects.toMatchObject({ url: "/grocery/list-1" });

    expect(created().p_items).toEqual([
      { quantity: 1, unit: "can", name: "tomatoes" },
      { quantity: 10, unit: null, name: "eggs" }, // 4 + 6
      { quantity: 3, unit: "clove", name: "garlic" }, // prep note dropped, then merged
      { quantity: 1, unit: "cup", name: "milk" }, // different units stay separate
      { quantity: 250, unit: "ml", name: "milk" },
    ].sort((x, y) => x.name.localeCompare(y.name)));
  });

  it("names the list after the recipes unless a name is given", async () => {
    await expect(createGroceryList({}, form(["a", "b"]))).rejects.toBeInstanceOf(RedirectSignal);
    expect(created().p_name).toBe("Shakshuka + Frittata");

    fake.calls.length = 0;
    await expect(createGroceryList({}, form(["a", "b", "c"]))).rejects.toBeInstanceOf(RedirectSignal);
    expect(created().p_name).toBe("Shakshuka + 2 more");

    fake.calls.length = 0;
    await expect(createGroceryList({}, form(["a"], "  Sunday shop "))).rejects.toBeInstanceOf(RedirectSignal);
    expect(created().p_name).toBe("Sunday shop");
  });

  it("de-duplicates recipe ids and caps a list at 20 recipes", async () => {
    const many = [...Array(30).keys()].map((i) => `r${i}`);
    await createGroceryList({}, form(["a", "a", ...many])).catch(() => {});
    const ids = fake.calls.find((c) => c.table === "ingredients")?.filters.find(([f]) => f === "in")?.[2] as string[];
    expect(ids).toHaveLength(20);
    expect(ids.filter((id) => id === "a")).toHaveLength(1);
  });

  it("asks for at least one recipe", async () => {
    expect(await createGroceryList({}, form([]))).toEqual({ error: "Pick at least one recipe." });
    expect(fake.calls).toHaveLength(0);
  });

  it("errors when none of the recipes can be seen (e.g. someone else's private recipe)", async () => {
    const result = await createGroceryList({}, form(["not-visible"]));
    expect(result.error).toMatch(/Could not load those recipes/);
    expect(created()).toBeUndefined();
  });

  it("reports a database failure instead of redirecting", async () => {
    rpcResult = { error: { message: "boom" } };
    expect(await createGroceryList({}, form(["a"]))).toEqual({ error: "Could not create the list: boom" });
  });

  it("sends signed-out users to sign in", async () => {
    fake.client.auth.getClaims.mockResolvedValueOnce({ data: null, error: null } as never);
    await expect(createGroceryList({}, form(["a"]))).rejects.toMatchObject({ url: "/login?next=%2Fgrocery%2Fnew" });
  });
});

describe("delete a grocery list", () => {
  it("only deletes the signed-in user's own list", async () => {
    await expect(deleteGroceryList("list-1")).rejects.toMatchObject({ url: "/grocery" });
    const del = fake.calls.find((c) => c.op === "delete");
    expect(del?.table).toBe("grocery_lists");
    expect(del?.filters).toEqual(expect.arrayContaining([["eq", "id", "list-1"], ["eq", "user_id", "user-1"]]));
  });
});
