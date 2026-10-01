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

import { moderateComment } from "@/app/admin/moderation/actions";
import { saveReview } from "@/app/comment-actions";

function form(stars: string, comment: string) {
  const fd = new FormData();
  fd.set("stars", stars);
  fd.set("comment", comment);
  return fd;
}

let fake: ReturnType<typeof fakeSupabase>;
let existing: unknown[];
let inserted: Result;
let moderated: Result;
let role = "admin";

beforeEach(() => {
  existing = [];
  inserted = { data: [{ id: "c1", status: "approved" }] };
  moderated = { data: [{ recipe_kind: "review", recipe_slug: "joes-tacos" }] };
  role = "admin";
  revalidatePath.mockClear();
  fake = fakeSupabase((call: Call) => {
    if (call.table === "profiles") return { data: { role } };
    if (call.table === "ratings_comments" && call.op === "update") return { data: existing };
    if (call.table === "ratings_comments" && call.op === "insert") return inserted;
    if (call.rpc === "moderate_comment") return moderated;
    return { data: null };
  });
  supabase.current = fake.client;
});

const save = (fd: FormData) => saveReview("recipe-1", "/reviews/joes-tacos", {}, fd);

describe("a flagged comment lands in pending", () => {
  it("tells the author it's waiting for approval when the database holds it", async () => {
    // The database's trigger flags links and spam words; here it returns 'pending'.
    inserted = { data: [{ id: "c1", status: "pending" }] };
    const result = await save(form("5", "Great! Cheap watches at www.example.ru"));

    expect(result).toEqual({ pending: true, message: "Thanks! Your comment will appear once it's been approved." });
  });

  it("never sends a status: the database decides, and users can't write that column", async () => {
    await save(form("5", "Loved it"));
    const insert = fake.calls.find((c) => c.op === "insert");
    expect(insert?.payload).toEqual({ recipe_id: "recipe-1", user_id: "user-1", stars: 5, comment: "Loved it" });
    expect(insert?.payload).not.toHaveProperty("status");
  });

  it("posts clean comments straight away", async () => {
    expect(await save(form("4", "So good"))).toEqual({ message: "Thanks for your review!" });
  });

  it("re-checks edits: adding a link to an approved comment sends it back to pending", async () => {
    existing = [{ id: "c1", status: "pending" }];
    expect(await save(form("4", "Updated, see my blog http://spam.example"))).toMatchObject({ pending: true });
  });

  it("explains when a moderator already rejected the comment", async () => {
    existing = [{ id: "c1", status: "rejected" }];
    expect((await save(form("1", "Edited"))).error).toMatch(/removed by a moderator/);
  });

  it("still works before the moderation migration (no status column)", async () => {
    inserted = { data: [{ id: "c1" }] };
    expect(await save(form("5", "Yum"))).toEqual({ message: "Thanks for your review!" });
  });
});

describe("moderation queue", () => {
  it("approves a comment and refreshes the post it belongs to", async () => {
    expect(await moderateComment("c1", "approved")).toEqual({});
    expect(fake.calls.find((c) => c.rpc === "moderate_comment")?.payload).toEqual({ p_id: "c1", p_status: "approved" });
    expect(revalidatePath).toHaveBeenCalledWith("/reviews/joes-tacos");
    expect(revalidatePath).toHaveBeenCalledWith("/admin/moderation");
  });

  it("rejects a comment", async () => {
    expect(await moderateComment("c1", "rejected")).toEqual({});
    expect(fake.calls.find((c) => c.rpc === "moderate_comment")?.payload).toMatchObject({ p_status: "rejected" });
  });

  it("refuses anything but approve/reject without touching the database", async () => {
    expect(await moderateComment("c1", "deleted" as never)).toEqual({ error: "Unknown decision." });
    expect(fake.calls).toHaveLength(0);
  });

  it("handles a comment that was deleted meanwhile", async () => {
    moderated = { error: { code: "P0002", message: "Comment not found" } };
    expect(await moderateComment("gone", "approved")).toEqual({ error: "That comment no longer exists." });
  });

  it("is admin-only, and needs 2FA", async () => {
    role = "reader";
    await expect(moderateComment("c1", "approved")).rejects.toBeInstanceOf(NotFoundSignal);

    role = "admin";
    fake.client.auth.getClaims.mockResolvedValue({ data: { claims: { sub: "admin-1", aal: "aal1" } }, error: null } as never);
    await expect(moderateComment("c1", "approved")).rejects.toMatchObject({ url: "/mfa?next=%2Fadmin%2Fmoderation" });
    expect(fake.calls.some((c) => c.rpc === "moderate_comment")).toBe(false);
  });
});
