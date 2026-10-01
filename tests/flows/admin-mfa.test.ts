import { beforeEach, describe, expect, it, vi } from "vitest";
import { NotFoundSignal, RedirectSignal, fakeSupabase, type Call } from "../fake-supabase";

const supabase = vi.hoisted(() => ({ current: null as unknown }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => supabase.current }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new RedirectSignal(url);
  },
  notFound: () => {
    throw new NotFoundSignal();
  },
}));

import { saveBlogPost } from "@/app/admin/blog/actions";
import { requireAdmin } from "@/lib/auth";

let fake: ReturnType<typeof fakeSupabase>;
let role = "admin";

beforeEach(() => {
  role = "admin";
  fake = fakeSupabase((call: Call) => (call.table === "profiles" ? { data: { role } } : { data: [] }));
  supabase.current = fake.client;
});

const session = (claims: Record<string, unknown> | null) =>
  fake.client.auth.getClaims.mockResolvedValue({ data: claims ? { claims } : null, error: null } as never);

describe("admin two-factor authentication", () => {
  it("lets an admin through once the session has passed 2FA (aal2)", async () => {
    session({ sub: "admin-1", aal: "aal2" });
    await expect(requireAdmin()).resolves.toMatchObject({ userId: "admin-1" });
  });

  it("sends an admin who only used a password (aal1) to /mfa, keeping where they were going", async () => {
    session({ sub: "admin-1", aal: "aal1" });
    await expect(requireAdmin("/admin/blog/new")).rejects.toMatchObject({ url: "/mfa?next=%2Fadmin%2Fblog%2Fnew" });
  });

  it("blocks admin actions too, not just pages", async () => {
    session({ sub: "admin-1", aal: "aal1" });
    const fd = new FormData();
    fd.set("title", "Sneaky");
    fd.set("body", "Hi");
    await expect(saveBlogPost({}, fd)).rejects.toMatchObject({ url: "/mfa?next=%2Fadmin" });
    expect(fake.calls.some((c) => c.table === "blog_posts")).toBe(false);
  });

  it("still 404s for non-admins, 2FA or not (doesn't reveal the dashboard)", async () => {
    role = "reader";
    session({ sub: "user-2", aal: "aal2" });
    await expect(requireAdmin()).rejects.toBeInstanceOf(NotFoundSignal);
    session({ sub: "user-2", aal: "aal1" });
    await expect(requireAdmin()).rejects.toBeInstanceOf(NotFoundSignal);
  });

  it("404s when signed out", async () => {
    session(null);
    await expect(requireAdmin()).rejects.toBeInstanceOf(NotFoundSignal);
  });
});
