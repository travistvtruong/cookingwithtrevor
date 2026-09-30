import { beforeEach, describe, expect, it, vi } from "vitest";
import { fakeSupabase, type Call, type Result } from "../fake-supabase";

const supabase = vi.hoisted(() => ({ current: null as unknown }));
const revalidatePath = vi.hoisted(() => vi.fn());
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => supabase.current }));
vi.mock("next/cache", () => ({ revalidatePath }));

import { deleteReview, saveReview } from "@/app/recipes/[slug]/actions";

function form(stars: string | null, comment = "") {
  const fd = new FormData();
  if (stars !== null) fd.set("stars", stars);
  fd.set("comment", comment);
  return fd;
}

let fake: ReturnType<typeof fakeSupabase>;
let existing: { id: string }[] = [];
let insertResult: Result = { data: null };
let deleteResult: Result = { data: [{ id: "review-1" }] };

beforeEach(() => {
  existing = [];
  insertResult = { data: null };
  deleteResult = { data: [{ id: "review-1" }] };
  revalidatePath.mockClear();
  fake = fakeSupabase((call: Call) => {
    if (call.table !== "ratings_comments") return { data: null };
    if (call.op === "update") return { data: existing };
    if (call.op === "insert") return insertResult;
    if (call.op === "delete") return deleteResult;
    return { data: null };
  });
  supabase.current = fake.client;
});

const save = (fd: FormData) => saveReview("recipe-1", "mango-cheesecake", {}, fd);
const ops = () => fake.calls.map((c) => c.op);

describe("rate and comment on a post", () => {
  it("posts a new review and refreshes the cached post page", async () => {
    const result = await save(form("5", "  Loved it!  "));

    expect(result).toEqual({ message: "Thanks for your review!" });
    expect(ops()).toEqual(["update", "insert"]); // tries an edit first, then inserts
    expect(fake.calls[1].payload).toEqual({
      recipe_id: "recipe-1",
      user_id: "user-1",
      stars: 5,
      comment: "Loved it!",
    });
    expect(revalidatePath).toHaveBeenCalledWith("/recipes/mango-cheesecake");
  });

  it("updates an existing review instead of adding a second one", async () => {
    existing = [{ id: "review-1" }];
    const result = await save(form("3", "Better with lime."));

    expect(result).toEqual({ message: "Review updated." });
    expect(ops()).toEqual(["update"]); // no insert, so edits don't hit the rate limit
    expect(fake.calls[0].payload).toEqual({ stars: 3, comment: "Better with lime." });
    expect(fake.calls[0].filters).toEqual(
      expect.arrayContaining([["eq", "recipe_id", "recipe-1"], ["eq", "user_id", "user-1"]]),
    );
  });

  it("allows a rating without a comment", async () => {
    expect(await save(form("4"))).toEqual({ message: "Thanks for your review!" });
  });

  it.each([
    [null, "Pick a star rating."],
    ["0", "Pick a star rating."],
    ["6", undefined],
    ["2.5", undefined],
  ])("rejects a star value of %j", async (stars, message) => {
    const result = await save(form(stars));
    expect(result.error).toBeTruthy();
    if (message) expect(result.error).toBe(message);
    expect(fake.calls).toHaveLength(0);
  });

  it("rejects comments over 2,000 characters", async () => {
    expect((await save(form("5", "x".repeat(2001)))).error).toMatch(/2,000/);
  });

  it("shows the database's rate-limit message to new accounts", async () => {
    insertResult = { error: { code: "P0001", message: "Too many reviews. Please try again later." } };
    expect(await save(form("5"))).toEqual({ error: "Too many reviews. Please try again later." });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("hides other database errors behind a friendly message", async () => {
    insertResult = { error: { code: "42501", message: "permission denied" } };
    expect((await save(form("5"))).error).toBe("Could not save your review. Please try again.");
  });

  it("asks signed-out visitors to sign in", async () => {
    fake.client.auth.getClaims.mockResolvedValueOnce({ data: null, error: null } as never);
    expect(await save(form("5"))).toEqual({ error: "Please sign in to leave a review." });
    expect(fake.calls).toHaveLength(0);
  });
});

describe("delete a review", () => {
  it("deletes and refreshes the post", async () => {
    expect(await deleteReview("review-1", "mango-cheesecake")).toEqual({ message: "Review deleted." });
    expect(revalidatePath).toHaveBeenCalledWith("/recipes/mango-cheesecake");
  });

  it("reports when nothing was deleted (not yours, and not admin, so RLS refused)", async () => {
    deleteResult = { data: [] };
    expect(await deleteReview("someone-elses", "mango-cheesecake")).toEqual({
      error: "Could not delete that review.",
    });
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
