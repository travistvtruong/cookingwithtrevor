import { beforeEach, describe, expect, it, vi } from "vitest";
import { RedirectSignal, fakeSupabase } from "../fake-supabase";

const supabase = vi.hoisted(() => ({ current: null as unknown }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => supabase.current }));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new RedirectSignal(url);
  },
}));

import { deleteAccount, updateName } from "@/app/account/actions";
import { countPendingComments, pendingLabel } from "@/lib/moderation";
import { instagramHandle } from "@/lib/site-config";
import type { SupabaseClient } from "@supabase/supabase-js";

function form(fields: Record<string, string>) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
}

let fake: ReturnType<typeof fakeSupabase>;
beforeEach(() => {
  fake = fakeSupabase();
  supabase.current = fake.client;
});

describe("change display name", () => {
  it("saves the trimmed name on the signed-in user's own profile", async () => {
    const result = await updateName({}, form({ name: "  Sam  " }));
    expect(result.message).toBe("Name saved.");
    expect(fake.calls).toContainEqual(
      expect.objectContaining({ table: "profiles", op: "update", payload: { name: "Sam" }, filters: [["eq", "id", "user-1"]] }),
    );
  });

  it("rejects an empty or overlong name without touching the database", async () => {
    expect((await updateName({}, form({ name: "   " }))).error).toMatch(/Enter a name/);
    expect((await updateName({}, form({ name: "x".repeat(81) }))).error).toMatch(/under 80/);
    expect(fake.calls).toHaveLength(0);
  });

  it("asks a signed-out visitor to sign in", async () => {
    fake.client.auth.getClaims.mockResolvedValueOnce({ data: null, error: null } as never);
    expect((await updateName({}, form({ name: "Sam" }))).error).toMatch(/sign in/);
  });
});

describe("delete account", () => {
  it("needs the confirmation phrase typed out", async () => {
    const result = await deleteAccount({}, form({ confirm: "yes" }));
    expect(result.error).toMatch(/delete my account/);
    expect(fake.calls).toHaveLength(0);
  });

  it("removes the user's photos, deletes the account, signs out and goes home", async () => {
    fake.storageList
      .mockResolvedValueOnce({ data: [{ name: "a.jpg" }, { name: "b.jpg" }], error: null })
      .mockResolvedValueOnce({ data: [], error: null });

    await expect(deleteAccount({}, form({ confirm: " Delete My Account " }))).rejects.toThrow(
      new RedirectSignal("/?account=deleted"),
    );
    expect(fake.storageList).toHaveBeenCalledWith("user-1", { limit: 100 });
    expect(fake.storageRemove).toHaveBeenCalledWith(["user-1/a.jpg", "user-1/b.jpg"]);
    expect(fake.calls.at(-1)).toMatchObject({ rpc: "delete_my_account", op: "rpc" });
    expect(fake.client.auth.signOut).toHaveBeenCalled();
  });

  it("keeps the account if its photos can't be removed", async () => {
    fake.storageList.mockResolvedValueOnce({ data: [{ name: "a.jpg" }], error: null });
    fake.storageRemove.mockResolvedValueOnce({ data: [], error: { message: "storage down" } });

    const result = await deleteAccount({}, form({ confirm: "delete my account" }));
    expect(result.error).toMatch(/storage down/);
    expect(fake.calls.some((c) => c.rpc === "delete_my_account")).toBe(false);
  });

  it("explains that the admin account can't be deleted", async () => {
    fake = fakeSupabase((call) =>
      call.rpc === "delete_my_account"
        ? { error: { code: "42501", message: "admin accounts cannot be deleted from the site" } }
        : {},
    );
    supabase.current = fake.client;

    const result = await deleteAccount({}, form({ confirm: "delete my account" }));
    expect(result.error).toBe("Admin accounts can't be deleted from the site.");
    expect(fake.client.auth.signOut).not.toHaveBeenCalled();
  });
});

describe("held-comment alerts", () => {
  it("counts pending comments", async () => {
    fake = fakeSupabase(() => ({ count: 3 }));
    expect(await countPendingComments(fake.client as unknown as SupabaseClient)).toBe(3);
    expect(fake.calls[0]).toMatchObject({ table: "ratings_comments", filters: expect.arrayContaining([["eq", "status", "pending"]]) });
  });

  it("shows nothing when the count can't be read", async () => {
    fake = fakeSupabase(() => ({ error: { message: "permission denied" } }));
    expect(await countPendingComments(fake.client as unknown as SupabaseClient)).toBe(0);
  });

  it("words the alert for one or many", () => {
    expect(pendingLabel(1)).toBe("1 comment waiting for review");
    expect(pendingLabel(4)).toBe("4 comments waiting for review");
  });
});

describe("instagram handle", () => {
  it("reads the handle from a profile URL", () => {
    expect(instagramHandle("https://www.instagram.com/cooking.with_trevor/")).toBe("@cooking.with_trevor");
    expect(instagramHandle("")).toBeNull();
  });
});
