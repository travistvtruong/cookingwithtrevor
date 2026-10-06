import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fakeSupabase } from "../fake-supabase";

const supabase = vi.hoisted(() => ({ current: null as unknown }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => supabase.current }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { saveReview } from "@/app/comment-actions";
import { verifyCaptcha } from "@/lib/turnstile-server";

function form(fields: Record<string, string>) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
}

const cloudflare = vi.fn();
let fake: ReturnType<typeof fakeSupabase>;

beforeEach(() => {
  fake = fakeSupabase(() => ({ data: [] }));
  supabase.current = fake.client;
  cloudflare.mockReset();
  vi.stubGlobal("fetch", cloudflare);
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("CAPTCHA (Turnstile)", () => {
  it("is off, and lets everything through, until the secret is set", async () => {
    expect(await verifyCaptcha(undefined, "comment")).toBe(true);
    expect(cloudflare).not.toHaveBeenCalled();
  });

  describe("with the secret set", () => {
    beforeEach(() => vi.stubEnv("TURNSTILE_SECRET_KEY", "secret-1"));

    it("asks Cloudflare and accepts a valid token for the right action", async () => {
      cloudflare.mockResolvedValue(Response.json({ success: true, action: "comment" }));
      expect(await verifyCaptcha("tok", "comment")).toBe(true);
      const body = cloudflare.mock.calls[0][1].body as URLSearchParams;
      expect(Object.fromEntries(body)).toEqual({ secret: "secret-1", response: "tok" });
    });

    it("rejects a missing token, a failed check, a token for another form, or no answer", async () => {
      expect(await verifyCaptcha(undefined, "comment")).toBe(false);
      cloudflare.mockResolvedValueOnce(Response.json({ success: false }));
      expect(await verifyCaptcha("tok", "comment")).toBe(false);
      cloudflare.mockResolvedValueOnce(Response.json({ success: true, action: "signup" }));
      expect(await verifyCaptcha("tok", "comment")).toBe(false);
      cloudflare.mockRejectedValueOnce(new TypeError("Failed to fetch"));
      expect(await verifyCaptcha("tok", "comment")).toBe(false);
    });

    it("blocks a comment without a passing check, before touching the database", async () => {
      const result = await saveReview("recipe-1", "/recipes/x", {}, form({ stars: "5", comment: "Spam?" }));
      expect(result.error).toMatch(/complete the check/);
      expect(fake.calls).toHaveLength(0);
    });

    it("saves a comment with a passing check", async () => {
      cloudflare.mockResolvedValue(Response.json({ success: true, action: "comment" }));
      fake = fakeSupabase((call) => (call.op === "insert" ? { data: [{ status: "approved" }] } : { data: [] }));
      supabase.current = fake.client;
      const result = await saveReview("recipe-1", "/recipes/x", {}, form({ stars: "5", comment: "Great", captcha_token: "tok" }));
      expect(result).toEqual({ message: "Thanks for your review!" });
    });
  });
});
