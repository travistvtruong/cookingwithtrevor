import { beforeEach, describe, expect, it, vi } from "vitest";
import { RedirectSignal, fakeSupabase } from "../fake-supabase";

const supabase = vi.hoisted(() => ({ current: null as unknown }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => supabase.current }));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new RedirectSignal(url);
  },
}));

import { verifyEmailLink } from "@/app/auth/confirm/actions";

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

describe("email links (confirm / reset) need a button press", () => {
  it("confirms a sign-up with the token and goes home", async () => {
    await expect(verifyEmailLink({}, form({ token_hash: "abc123", type: "email" }))).rejects.toMatchObject({ url: "/" });
    expect(fake.client.auth.verifyOtp).toHaveBeenCalledWith({ type: "email", token_hash: "abc123" });
  });

  it("sends password resets to the set-new-password page by default", async () => {
    await expect(verifyEmailLink({}, form({ token_hash: "abc123", type: "recovery" }))).rejects.toMatchObject({
      url: "/reset-password",
    });
  });

  it("follows a same-site `next`, but never an off-site one", async () => {
    await expect(
      verifyEmailLink({}, form({ token_hash: "t", type: "email", next: "/recipes/mango" })),
    ).rejects.toMatchObject({ url: "/recipes/mango" });
    await expect(
      verifyEmailLink({}, form({ token_hash: "t", type: "email", next: "https://evil.example" })),
    ).rejects.toMatchObject({ url: "/" });
  });

  it("explains a used or expired link instead of failing silently", async () => {
    fake.client.auth.verifyOtp.mockResolvedValueOnce({ data: {}, error: { code: "otp_expired", message: "expired" } });
    expect((await verifyEmailLink({}, form({ token_hash: "t", type: "email" }))).error).toMatch(/just sign in/);

    fake.client.auth.verifyOtp.mockResolvedValueOnce({ data: {}, error: { code: "otp_expired", message: "expired" } });
    expect((await verifyEmailLink({}, form({ token_hash: "t", type: "recovery" }))).error).toMatch(/Request a new one/);
  });

  it("rejects incomplete or unknown link types without calling Supabase", async () => {
    expect((await verifyEmailLink({}, form({ token_hash: "", type: "email" }))).error).toMatch(/incomplete/);
    expect((await verifyEmailLink({}, form({ token_hash: "t", type: "sms" }))).error).toMatch(/incomplete/);
    expect(fake.client.auth.verifyOtp).not.toHaveBeenCalled();
  });
});
