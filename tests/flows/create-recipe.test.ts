import { beforeEach, describe, expect, it, vi } from "vitest";
import { NotFoundSignal, RedirectSignal, fakeSupabase, type Call, type Result } from "../fake-supabase";

const supabase = vi.hoisted(() => ({ current: null as unknown }));
const revalidatePath = vi.hoisted(() => vi.fn());
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => supabase.current }));
vi.mock("next/cache", () => ({ revalidatePath }));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new RedirectSignal(url);
  },
  notFound: () => {
    throw new NotFoundSignal();
  },
}));

import { saveRecipe } from "@/app/admin/actions";
import { saveMyRecipe } from "@/app/library/actions";

const VALID = {
  title: "Mango Cheesecake",
  slug: "",
  intro: "No-bake and bright.",
  photo_url: "",
  prep_min: "20",
  cook_min: "",
  servings: "8",
  tags: "Dessert, No Bake, dessert",
  ingredients: "2 cups graham crumbs\n1/2 cup butter\n\n3 mangoes",
  steps: "Crush the crumbs.\nChill overnight.",
};

function form(fields: Record<string, string>) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
}

let fake: ReturnType<typeof fakeSupabase>;
let role = "admin";
let rpcResult: Result = { data: { id: "recipe-1", slug: "mango-cheesecake" } };

beforeEach(() => {
  role = "admin";
  rpcResult = { data: { id: "recipe-1", slug: "mango-cheesecake" } };
  revalidatePath.mockClear();
  fake = fakeSupabase((call: Call) => {
    if (call.table === "profiles") return { data: { role } };
    if (call.rpc === "save_recipe") return rpcResult;
    return { data: null };
  });
  supabase.current = fake.client;
});

const rpcCall = () => fake.calls.find((c) => c.rpc === "save_recipe");

describe("create a blog post (admin dashboard)", () => {
  it("parses the form, saves in one RPC, revalidates and returns to the dashboard", async () => {
    await expect(saveRecipe({}, form({ ...VALID, intent: "publish" }))).rejects.toMatchObject({ url: "/admin" });

    expect(rpcCall()?.payload).toEqual({
      p_id: null,
      p_recipe: {
        kind: "recipe",
        title: "Mango Cheesecake",
        slug: "mango-cheesecake", // generated from the title when left blank
        intro: "No-bake and bright.",
        photo_url: null,
        prep_min: 20,
        cook_min: null,
        servings: 8,
        tags: ["dessert", "no-bake"], // slugified and de-duplicated
        place_name: null,
        place_location: null,
        my_rating: null,
        is_public: true,
      },
      p_ingredients: [
        { quantity: 2, unit: "cup", name: "graham crumbs" },
        { quantity: 0.5, unit: "cup", name: "butter" },
        { quantity: 3, unit: null, name: "mangoes" },
      ],
      p_steps: ["Crush the crumbs.", "Chill overnight."],
    });
    expect(revalidatePath).toHaveBeenCalledWith("/");
    expect(revalidatePath).toHaveBeenCalledWith("/recipes");
    expect(revalidatePath).toHaveBeenCalledWith("/recipes/mango-cheesecake");
  });

  it("'Save draft' keeps the post private", async () => {
    await expect(saveRecipe({}, form({ ...VALID, intent: "draft" }))).rejects.toBeInstanceOf(RedirectSignal);
    expect((rpcCall()?.payload as { p_recipe: { is_public: boolean } }).p_recipe.is_public).toBe(false);
  });

  it("returns field errors and the typed values when required fields are missing", async () => {
    const result = await saveRecipe({}, form({ ...VALID, title: " ", ingredients: "", steps: "" }));
    expect(result.fieldErrors).toMatchObject({
      title: "Title is required.",
      ingredients: "Add at least one ingredient.",
      steps: "Add at least one step.",
    });
    expect(result.values?.intro).toBe("No-bake and bright.");
    expect(rpcCall()).toBeUndefined();
  });

  it("rejects photos that weren't uploaded to the site's storage bucket", async () => {
    const result = await saveRecipe({}, form({ ...VALID, photo_url: "https://evil.example/x.jpg" }));
    expect(result.fieldErrors?.photo_url).toMatch(/Upload the photo/);
  });

  it("explains a duplicate URL instead of failing", async () => {
    rpcResult = { error: { code: "23505", message: "duplicate key" } };
    const result = await saveRecipe({}, form({ ...VALID, slug: "taken" }));
    expect(result.fieldErrors?.slug).toBe("Another recipe already uses this URL.");
  });

  it("revalidates the old URL too when a post's URL changes", async () => {
    await expect(
      saveRecipe({}, form({ ...VALID, id: "recipe-1", previous_slug: "old-url", intent: "publish" })),
    ).rejects.toBeInstanceOf(RedirectSignal);
    expect(revalidatePath).toHaveBeenCalledWith("/recipes/old-url");
  });

  it("revalidates the old URL too when a post's URL changes", async () => {
    await expect(
      saveRecipe({}, form({ ...VALID, id: "recipe-1", previous_slug: "older-url", intent: "publish" })),
    ).rejects.toBeInstanceOf(RedirectSignal);
    expect(revalidatePath).toHaveBeenCalledWith("/recipes/older-url");
    expect(revalidatePath).toHaveBeenCalledWith("/reviews/older-url");
  });

  it("is hidden (404) from signed-in users who aren't admin", async () => {
    role = "reader";
    await expect(saveRecipe({}, form(VALID))).rejects.toBeInstanceOf(NotFoundSignal);
    expect(rpcCall()).toBeUndefined();
  });
});

describe("create a food review post (admin dashboard)", () => {
  const REVIEW = {
    ...VALID,
    kind: "review",
    title: "Best tacos in town",
    place_name: " Joe's Tacos ",
    place_location: "Austin, TX",
    my_rating: "4",
    intro: "Crispy, cheap and fast.",
    ingredients: "",
    steps: "",
  };

  it("saves the place and rating, with no ingredients, steps or times", async () => {
    rpcResult = { data: { id: "review-1", slug: "best-tacos-in-town" } };
    await expect(saveRecipe({}, form({ ...REVIEW, intent: "publish" }))).rejects.toMatchObject({ url: "/admin" });

    const payload = rpcCall()?.payload as {
      p_recipe: Record<string, unknown>;
      p_ingredients: unknown[];
      p_steps: unknown[];
    };
    expect(payload.p_recipe).toMatchObject({
      kind: "review",
      slug: "best-tacos-in-town",
      place_name: "Joe's Tacos",
      place_location: "Austin, TX",
      my_rating: 4,
      prep_min: null, // recipe-only fields are cleared even if the form sent them
      servings: null,
    });
    expect(payload.p_ingredients).toEqual([]);
    expect(payload.p_steps).toEqual([]);
    expect(revalidatePath).toHaveBeenCalledWith("/reviews/best-tacos-in-town");
    expect(revalidatePath).toHaveBeenCalledWith("/reviews");
  });

  it("requires a place and a 1-5 rating, but not ingredients or steps", async () => {
    const result = await saveRecipe({}, form({ ...REVIEW, place_name: " ", my_rating: "" }));
    expect(result.fieldErrors).toEqual({
      place_name: "Add the place or dish you're reviewing.",
      my_rating: "Pick your rating.",
    });

    for (const bad of ["0", "6", "2.5", "abc"]) {
      const r = await saveRecipe({}, form({ ...REVIEW, my_rating: bad }));
      expect(r.fieldErrors?.my_rating).toBe("Pick your rating.");
    }
  });
});

describe("add a private recipe (library)", () => {
  it("forces it private, gives it a unique URL and adds it to the library", async () => {
    await expect(saveMyRecipe({}, form({ ...VALID, intent: "publish" }))).rejects.toMatchObject({
      url: "/library/recipe-1",
    });

    const payload = rpcCall()?.payload as {
      p_recipe: { slug: string; is_public: boolean; photo_url: string | null };
      p_add_to_library: boolean;
    };
    expect(payload.p_recipe.is_public).toBe(false); // can't publish from the library
    expect(payload.p_recipe.photo_url).toBeNull();
    expect(payload.p_recipe.slug).toMatch(/^mango-cheesecake-[0-9a-f]{6}$/);
    expect(payload.p_add_to_library).toBe(true);
  });

  describe("photos on private recipes", () => {
    const ME = "11111111-1111-4111-8111-111111111111";
    const SOMEONE_ELSE = "22222222-2222-4222-8222-222222222222";
    const FILE = "33333333-3333-4333-8333-333333333333.jpg";

    beforeEach(() => {
      fake.client.auth.getClaims.mockResolvedValue({ data: { claims: { sub: ME } }, error: null } as never);
    });

    it("saves a photo stored in the user's own private folder", async () => {
      await expect(saveMyRecipe({}, form({ ...VALID, photo_url: `${ME}/${FILE}` }))).rejects.toBeInstanceOf(
        RedirectSignal,
      );
      expect((rpcCall()?.payload as { p_recipe: { photo_url: string } }).p_recipe.photo_url).toBe(`${ME}/${FILE}`);
    });

    it.each([
      ["someone else's folder", `${SOMEONE_ELSE}/${FILE}`],
      ["the public blog bucket", "https://test-project.supabase.co/storage/v1/object/public/recipe-photos/x.jpg"],
      ["an outside URL", "https://evil.example/x.jpg"],
      ["a path escape", `${ME}/../${FILE}`],
    ])("rejects a photo from %s", async (_label, photo) => {
      const result = await saveMyRecipe({}, form({ ...VALID, photo_url: photo }));
      expect(result.fieldErrors?.photo_url).toMatch(/Upload the photo/);
      expect(rpcCall()).toBeUndefined();
    });
  });

  it("is always a recipe, even if the form claims to be a review", async () => {
    await expect(saveMyRecipe({}, form({ ...VALID, kind: "review" }))).rejects.toBeInstanceOf(RedirectSignal);
    expect((rpcCall()?.payload as { p_recipe: { kind: string } }).p_recipe.kind).toBe("recipe");
  });

  it("keeps the existing URL and doesn't re-add to the library on edit", async () => {
    await expect(
      saveMyRecipe({}, form({ ...VALID, id: "recipe-1", previous_slug: "mango-cheesecake-abc123" })),
    ).rejects.toBeInstanceOf(RedirectSignal);
    const payload = rpcCall()?.payload as { p_recipe: { slug: string }; p_add_to_library: boolean };
    expect(payload.p_recipe.slug).toBe("mango-cheesecake-abc123");
    expect(payload.p_add_to_library).toBe(false);
  });

  it("sends signed-out users to sign in", async () => {
    fake.client.auth.getClaims.mockResolvedValueOnce({ data: null, error: null } as never);
    await expect(saveMyRecipe({}, form(VALID))).rejects.toMatchObject({ url: "/login?next=%2Flibrary" });
  });
});
