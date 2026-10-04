import { beforeEach, describe, expect, it, vi } from "vitest";
import { RedirectSignal, fakeSupabase } from "../fake-supabase";

const supabase = vi.hoisted(() => ({ current: null as unknown }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => supabase.current }));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new RedirectSignal(url);
  },
}));

import { requestPasswordReset, updatePassword } from "@/app/password/actions";

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

const SENT = /If there's an account for that email/;

describe("forgot password", () => {
  it("emails a reset link that returns to the set-new-password page", async () => {
    const result = await requestPasswordReset({}, form({ email: " me@example.com " }));
    expect(fake.client.auth.resetPasswordForEmail).toHaveBeenCalledWith("me@example.com", {
      redirectTo: "https://cookingwithtrevor.test/auth/callback?next=%2Freset-password",
    });
    expect(result.message).toMatch(SENT);
  });

  it("gives the same answer whether or not the account exists", async () => {
    fake.client.auth.resetPasswordForEmail.mockResolvedValueOnce({
      data: {},
      error: { code: "user_not_found", message: "User not found" },
    });
    expect((await requestPasswordReset({}, form({ email: "nobody@example.com" }))).message).toMatch(SENT);
  });

  it("explains rate limiting", async () => {
    fake.client.auth.resetPasswordForEmail.mockResolvedValueOnce({
      data: {},
      error: { code: "over_email_send_rate_limit", status: 429, message: "rate limit" },
    });
    expect((await requestPasswordReset({}, form({ email: "me@example.com" }))).error).toMatch(/wait a few minutes/);
  });

  it("checks the email looks like an email before sending", async () => {
    expect((await requestPasswordReset({}, form({ email: "not-an-email" }))).error).toMatch(/Enter the email/);
    expect(fake.client.auth.resetPasswordForEmail).not.toHaveBeenCalled();
  });
});

describe("set a new password", () => {
  it("updates the password and goes home", async () => {
    await expect(updatePassword({}, form({ password: "new-password-1", confirm: "new-password-1" }))).rejects.toMatchObject({
      url: "/?password=updated",
    });
    expect(fake.client.auth.updateUser).toHaveBeenCalledWith({ password: "new-password-1" });
  });

  it("validates length and matching before calling Supabase", async () => {
    expect((await updatePassword({}, form({ password: "short", confirm: "short" }))).error).toMatch(/at least 8/);
    expect((await updatePassword({}, form({ password: "long-enough-1", confirm: "different-1" }))).error).toMatch(
      /don't match/,
    );
    expect(fake.client.auth.updateUser).not.toHaveBeenCalled();
  });

  it("asks accounts with 2FA to enter their code first", async () => {
    fake.client.auth.updateUser.mockResolvedValueOnce({
      data: { user: {} },
      error: { code: "insufficient_aal", message: "AAL2 required" },
    });
    expect(await updatePassword({}, form({ password: "new-password-1", confirm: "new-password-1" }))).toMatchObject({
      needsMfa: true,
    });
  });

  it("explains an expired link (no session)", async () => {
    fake.client.auth.getClaims.mockResolvedValueOnce({ data: null, error: null } as never);
    expect((await updatePassword({}, form({ password: "new-password-1", confirm: "new-password-1" }))).error).toMatch(
      /expired/,
    );
  });
});
