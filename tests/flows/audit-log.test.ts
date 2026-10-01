import { beforeEach, describe, expect, it, vi } from "vitest";
import { RedirectSignal, fakeSupabase, type Call, type Result } from "../fake-supabase";

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

import { deleteRecipe, saveRecipe } from "@/app/admin/actions";
import { deleteReview } from "@/app/comment-actions";

const RECIPE = {
  title: "Mango Cheesecake",
  slug: "",
  intro: "",
  photo_url: "",
  prep_min: "",
  cook_min: "",
  servings: "",
  tags: "",
  ingredients: "3 mangoes",
  steps: "Blend.",
};

function form(fields: Record<string, string>) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
}

let fake: ReturnType<typeof fakeSupabase>;
let previous: { photo_url: string | null; is_public: boolean } | null;
let auditResult: Result;
let deletedComment: Result;

beforeEach(() => {
  previous = null;
  auditResult = { data: null };
  deletedComment = { data: [{ id: "c1", user_id: "someone-else", stars: 1, comment: "spam spam" }] };
  fake = fakeSupabase((call: Call) => {
    if (call.table === "profiles") return { data: { role: "admin" } };
    if (call.rpc === "save_recipe") return { data: { id: "recipe-1", slug: "mango-cheesecake" } };
    if (call.rpc === "log_admin_action") return auditResult;
    if (call.table === "recipes" && call.op === "select") return { data: previous };
    if (call.table === "recipes" && call.op === "delete") {
      return { data: [{ id: "recipe-1", kind: "recipe", title: "Mango Cheesecake", photo_url: null }] };
    }
    if (call.table === "ratings_comments") return deletedComment;
    return { data: null };
  });
  supabase.current = fake.client;
});

const logged = () =>
  fake.calls.filter((c) => c.rpc === "log_admin_action").map((c) => c.payload as Record<string, unknown>);

describe("audit log", () => {
  it.each([
    [null, "publish", "recipe.published"],
    [null, "draft", "recipe.created"],
    [{ photo_url: null, is_public: false }, "publish", "recipe.published"],
    [{ photo_url: null, is_public: true }, "publish", "recipe.updated"],
    [{ photo_url: null, is_public: true }, "draft", "recipe.unpublished"],
  ])("records the right action (before: %j, button: %s → %s)", async (before, intent, action) => {
    previous = before;
    const id: Record<string, string> = before ? { id: "recipe-1" } : {};
    await expect(saveRecipe({}, form({ ...RECIPE, ...id, intent }))).rejects.toBeInstanceOf(RedirectSignal);
    expect(logged()).toEqual([
      {
        p_action: action,
        p_entity_type: "recipe",
        p_entity_id: "recipe-1",
        p_summary: "Mango Cheesecake",
        p_details: { slug: "mango-cheesecake" },
      },
    ]);
  });

  it("logs review posts under their own type", async () => {
    await expect(
      saveRecipe({}, form({ ...RECIPE, kind: "review", place_name: "Joe's", my_rating: "4", intent: "publish" })),
    ).rejects.toBeInstanceOf(RedirectSignal);
    expect(logged()[0]).toMatchObject({ p_action: "review.published", p_entity_type: "review" });
  });

  it("logs deletes", async () => {
    await expect(deleteRecipe("recipe-1", "mango-cheesecake")).rejects.toBeInstanceOf(RedirectSignal);
    expect(logged()[0]).toMatchObject({ p_action: "recipe.deleted", p_summary: "Mango Cheesecake" });
  });

  it("logs the admin deleting someone else's comment, but not users deleting their own", async () => {
    await deleteReview("c1", "/recipes/mango-cheesecake");
    expect(logged()[0]).toMatchObject({
      p_action: "comment.deleted",
      p_entity_id: "c1",
      p_summary: "1★ spam spam",
      p_details: { author_id: "someone-else", path: "/recipes/mango-cheesecake" },
    });

    fake.calls.length = 0;
    deletedComment = { data: [{ id: "c2", user_id: "user-1", stars: 5, comment: "mine" }] };
    await deleteReview("c2", "/recipes/mango-cheesecake");
    expect(logged()).toEqual([]);
  });

  it("never blocks the action if the log can't be written", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    auditResult = { error: { code: "PGRST202", message: "function not found" } };
    await expect(saveRecipe({}, form({ ...RECIPE, intent: "publish" }))).rejects.toMatchObject({ url: "/admin" });
  });
});
