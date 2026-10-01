import { beforeEach, describe, expect, it, vi } from "vitest";
import { RedirectSignal, fakeSupabase, type Call, type Result } from "../fake-supabase";
import { readGallery } from "@/lib/gallery";

const supabase = vi.hoisted(() => ({ current: null as unknown }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => supabase.current }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new RedirectSignal(url);
  },
  notFound: () => {
    throw new Error("NOT_FOUND");
  },
}));

import { saveBlogPost, deleteBlogPost } from "@/app/admin/blog/actions";
import { deleteRecipe, saveRecipe } from "@/app/admin/actions";

const BUCKET = "https://test-project.supabase.co/storage/v1/object/public/recipe-photos/";
const photo = (name: string, caption = "") => ({ url: `${BUCKET}${name}.jpg`, caption });

function fd(fields: Record<string, string>) {
  const f = new FormData();
  for (const [k, v] of Object.entries(fields)) f.set(k, v);
  return f;
}

const RECIPE = {
  title: "Mango Cheesecake",
  slug: "mango-cheesecake",
  intro: "",
  photo_url: `${BUCKET}main.jpg`,
  prep_min: "",
  cook_min: "",
  servings: "",
  tags: "",
  ingredients: "3 mangoes",
  steps: "Blend.",
  intent: "publish",
};

let fake: ReturnType<typeof fakeSupabase>;
let setResult: Result;
let existingGallery: unknown[];

beforeEach(() => {
  setResult = { data: [] };
  existingGallery = [];
  fake = fakeSupabase((call: Call) => {
    if (call.table === "profiles") return { data: { role: "admin" } };
    if (call.rpc === "save_recipe") return { data: { id: "recipe-1", slug: "mango-cheesecake" } };
    if (call.rpc === "set_post_photos") return setResult;
    if (call.table === "post_photos") return { data: existingGallery };
    if (call.table === "recipes" && call.op === "delete") {
      return { data: [{ id: "recipe-1", kind: "recipe", title: "Mango", photo_url: `${BUCKET}main.jpg` }] };
    }
    if (call.table === "blog_posts" && (call.op === "insert" || call.op === "update")) {
      return { data: [{ id: "post-1", slug: "hanoi" }] };
    }
    if (call.table === "blog_posts" && call.op === "delete") return { data: [{ id: "post-1", cover_photo_url: null }] };
    return { data: null };
  });
  supabase.current = fake.client;
});

const setCall = () => fake.calls.find((c) => c.rpc === "set_post_photos");

describe("readGallery", () => {
  it("parses the form's JSON, trims captions and drops duplicate uploads", () => {
    const f = new FormData();
    f.set("gallery", JSON.stringify([photo("a", "  The crust  "), photo("b"), photo("a", "again")]));
    expect(readGallery(f)).toEqual({ photos: [photo("a", "The crust"), photo("b")] });
  });

  it("treats a missing field as no extra photos", () => {
    expect(readGallery(new FormData())).toEqual({ photos: [] });
  });

  it.each([
    ["not json", /couldn't be read/],
    [JSON.stringify([{ url: "https://evil.example/x.jpg", caption: "" }]), /Upload photos using the button/],
    [JSON.stringify(Array.from({ length: 13 }, (_, i) => photo(`p${i}`))), /Up to 12/],
    [JSON.stringify([photo("a", "x".repeat(201))]), /under 200/],
  ])("rejects %s", (raw, message) => {
    const f = new FormData();
    f.set("gallery", raw);
    const result = readGallery(f);
    expect("error" in result && result.error).toMatch(message);
  });
});

describe("multiple photos on a post", () => {
  it("saves the gallery in order with the recipe, after the post itself", async () => {
    const gallery = [photo("step-1", "Crushing biscuits"), photo("slice")];
    await expect(saveRecipe({}, fd({ ...RECIPE, gallery: JSON.stringify(gallery) }))).rejects.toMatchObject({
      url: "/admin",
    });

    expect(setCall()?.payload).toEqual({ p_recipe_id: "recipe-1", p_blog_post_id: null, p_photos: gallery });
    const order = fake.calls.map((c) => c.rpc).filter(Boolean);
    expect(order.indexOf("save_recipe")).toBeLessThan(order.indexOf("set_post_photos"));
  });

  it("deletes files removed from the gallery, but never the post's main photo", async () => {
    setResult = { data: [{ removed_url: `${BUCKET}old.jpg` }, { removed_url: `${BUCKET}main.jpg` }] };
    await expect(saveRecipe({}, fd({ ...RECIPE, gallery: "[]" }))).rejects.toBeInstanceOf(RedirectSignal);
    expect(fake.storageRemove).toHaveBeenCalledWith(["old.jpg"]);
    expect(fake.storageRemove).not.toHaveBeenCalledWith(["main.jpg"]);
  });

  it("works for blog posts too", async () => {
    const gallery = [photo("market")];
    await expect(
      saveBlogPost({}, fd({ title: "Hanoi", body: "Pho.", photo_url: "", gallery: JSON.stringify(gallery), intent: "publish" })),
    ).rejects.toBeInstanceOf(RedirectSignal);
    expect(setCall()?.payload).toEqual({ p_recipe_id: null, p_blog_post_id: "post-1", p_photos: gallery });
  });

  it("rejects a bad gallery before saving anything", async () => {
    const result = await saveRecipe({}, fd({ ...RECIPE, gallery: JSON.stringify([{ url: "https://evil.example/x.jpg" }]) }));
    expect(result.error).toMatch(/Upload photos using the button/);
    expect(fake.calls.some((c) => c.rpc === "save_recipe")).toBe(false);
  });

  it("before the migration: posts without extra photos still save; with photos, says why they didn't", async () => {
    setResult = { error: { code: "PGRST202", message: "function not found" } };
    await expect(saveRecipe({}, fd({ ...RECIPE, gallery: "[]" }))).rejects.toBeInstanceOf(RedirectSignal);

    const result = await saveRecipe({}, fd({ ...RECIPE, gallery: JSON.stringify([photo("a")]) }));
    expect(result.error).toMatch(/run the post photos migration/);
  });

  it("deleting a post also deletes its gallery files", async () => {
    existingGallery = [photo("a"), photo("b")];
    await expect(deleteRecipe("recipe-1", "mango-cheesecake")).rejects.toBeInstanceOf(RedirectSignal);
    expect(fake.storageRemove).toHaveBeenCalledWith(["a.jpg"]);
    expect(fake.storageRemove).toHaveBeenCalledWith(["b.jpg"]);

    fake.storageRemove.mockClear();
    await expect(deleteBlogPost("post-1", "hanoi")).rejects.toBeInstanceOf(RedirectSignal);
    expect(fake.storageRemove).toHaveBeenCalledWith(["a.jpg"]);
  });
});
