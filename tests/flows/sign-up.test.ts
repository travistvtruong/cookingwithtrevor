import { beforeEach, describe, expect, it, vi } from "vitest";
import { RedirectSignal, fakeSupabase } from "../fake-supabase";

const supabase = vi.hoisted(() => ({ current: null as unknown }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => supabase.current }));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new RedirectSignal(url);
  },
}));

import { signIn, signUp } from "@/app/login/actions";

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

describe("sign up", () => {
  it("rejects passwords shorter than 8 characters without calling Supabase", async () => {
    const result = await signUp({}, form({ email: "a@b.co", password: "short", name: "Ana" }));
    expect(result.error).toMatch(/at least 8/);
    expect(fake.client.auth.signUp).not.toHaveBeenCalled();
  });

  it("creates the account with the name and a callback that returns to `next`", async () => {
    const result = await signUp({}, form({
      email: " ana@example.com ",
      password: "correct-horse",
      name: " Ana ",
      next: "/recipes/mango",
    }));

    expect(fake.client.auth.signUp).toHaveBeenCalledWith({
      email: "ana@example.com",
      password: "correct-horse",
      options: {
        data: { name: "Ana" },
        emailRedirectTo: "https://cookingwithtrevor.test/auth/callback?next=%2Frecipes%2Fmango",
      },
    });
    // Email confirmation is on, so there's no session yet.
    expect(result).toEqual({ message: "Check your email to confirm your account." });
  });

  it("goes straight to `next` when Supabase returns a session", async () => {
    fake.client.auth.signUp.mockResolvedValueOnce({
      data: { session: { access_token: "t" }, user: { id: "u" } },
      error: null,
    } as never);
    await expect(
      signUp({}, form({ email: "a@b.co", password: "long-enough", next: "/library" })),
    ).rejects.toMatchObject({ url: "/library" });
  });

  it("never redirects off-site, even if `next` is tampered with", async () => {
    fake.client.auth.signUp.mockResolvedValueOnce({
      data: { session: { access_token: "t" }, user: { id: "u" } },
      error: null,
    } as never);
    await expect(
      signUp({}, form({ email: "a@b.co", password: "long-enough", next: "//evil.example" })),
    ).rejects.toMatchObject({ url: "/" });
  });

  it("shows Supabase's error message (e.g. already registered)", async () => {
    fake.client.auth.signUp.mockResolvedValueOnce({
      data: { session: null, user: null },
      error: { message: "User already registered" },
    } as never);
    const result = await signUp({}, form({ email: "a@b.co", password: "long-enough" }));
    expect(result).toEqual({ error: "User already registered" });
  });
});

describe("sign in", () => {
  it("redirects to `next` on success", async () => {
    await expect(
      signIn({}, form({ email: "a@b.co", password: "pw", next: "/grocery" })),
    ).rejects.toMatchObject({ url: "/grocery" });
    expect(fake.client.auth.signInWithPassword).toHaveBeenCalledWith({ email: "a@b.co", password: "pw" });
  });

  it("returns the error for wrong credentials", async () => {
    fake.client.auth.signInWithPassword.mockResolvedValueOnce({
      data: {},
      error: { message: "Invalid login credentials" },
    } as never);
    expect(await signIn({}, form({ email: "a@b.co", password: "nope" }))).toEqual({
      error: "Invalid login credentials",
    });
  });
});
