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

import { deleteBlogPost, saveBlogPost } from "@/app/admin/blog/actions";

const BUCKET = "https://test-project.supabase.co/storage/v1/object/public/recipe-photos/";

const VALID = {
  title: "A Week of Street Food in Hanoi",
  slug: "",
  excerpt: "  Noodles, coffee and a lot of walking.  ",
  body: "## Day one\nPho for breakfast.\n\n- Bun cha\n- Egg coffee",
  photo_url: `${BUCKET}cover.jpg`,
  tags: "Travel, Vietnam, travel",
};

function form(fields: Record<string, string>) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
}

let fake: ReturnType<typeof fakeSupabase>;
let role = "admin";
let writeResult: Result;
let previousCover: string | null = null;

beforeEach(() => {
  role = "admin";
  previousCover = null;
  writeResult = { data: [{ id: "post-1", slug: "a-week-of-street-food-in-hanoi" }] };
  revalidatePath.mockClear();
  fake = fakeSupabase((call: Call) => {
    if (call.table === "profiles") return { data: { role } };
    if (call.table === "blog_posts" && call.op === "select") return { data: { cover_photo_url: previousCover } };
    if (call.table === "blog_posts") return writeResult;
    return { data: null };
  });
  supabase.current = fake.client;
});

const write = () => fake.calls.find((c) => c.table === "blog_posts" && (c.op === "insert" || c.op === "update"));

describe("publish a blog post (admin dashboard)", () => {
  it("validates, inserts, refreshes the blog pages and returns to the dashboard", async () => {
    await expect(saveBlogPost({}, form({ ...VALID, intent: "publish" }))).rejects.toMatchObject({ url: "/admin" });

    expect(write()?.op).toBe("insert");
    expect(write()?.payload).toEqual({
      title: "A Week of Street Food in Hanoi",
      slug: "a-week-of-street-food-in-hanoi", // generated from the title
      excerpt: "Noodles, coffee and a lot of walking.",
      body: "## Day one\nPho for breakfast.\n\n- Bun cha\n- Egg coffee",
      cover_photo_url: `${BUCKET}cover.jpg`,
      tags: ["travel", "vietnam"],
      is_public: true,
    });
    // No author_id or published_at from the app: the database sets those.
    expect(revalidatePath).toHaveBeenCalledWith("/");
    expect(revalidatePath).toHaveBeenCalledWith("/blog");
    expect(revalidatePath).toHaveBeenCalledWith("/blog/a-week-of-street-food-in-hanoi");
  });

  it("'Save draft' keeps it private", async () => {
    await expect(saveBlogPost({}, form({ ...VALID, intent: "draft" }))).rejects.toBeInstanceOf(RedirectSignal);
    expect((write()?.payload as { is_public: boolean }).is_public).toBe(false);
  });

  it("updates an existing post and removes a replaced cover photo", async () => {
    previousCover = `${BUCKET}old-cover.jpg`;
    await expect(
      saveBlogPost({}, form({ ...VALID, id: "post-1", previous_slug: "old-slug", intent: "publish" })),
    ).rejects.toBeInstanceOf(RedirectSignal);

    expect(write()?.op).toBe("update");
    expect(write()?.filters).toContainEqual(["eq", "id", "post-1"]);
    expect(fake.storageRemove).toHaveBeenCalledWith(["old-cover.jpg"]);
    expect(revalidatePath).toHaveBeenCalledWith("/blog/old-slug");
  });

  it("requires a title and body, and rejects off-site cover photos", async () => {
    const result = await saveBlogPost(
      {},
      form({ ...VALID, title: " ", body: "", photo_url: "https://evil.example/x.jpg" }),
    );
    expect(result.fieldErrors).toMatchObject({
      title: "Title is required.",
      body: "Write something first.",
      cover_photo_url: "Upload the photo using the button.",
    });
    expect(write()).toBeUndefined();
  });

  it("explains a duplicate URL", async () => {
    writeResult = { error: { code: "23505", message: "duplicate key" } };
    const result = await saveBlogPost({}, form({ ...VALID, slug: "taken" }));
    expect(result.fieldErrors?.slug).toBe("Another blog post already uses this URL.");
  });

  it("reports when RLS saved nothing instead of pretending it worked", async () => {
    writeResult = { data: [] };
    const result = await saveBlogPost({}, form({ ...VALID, id: "someone-elses" }));
    expect(result.error).toMatch(/wasn't found or you don't have access/);
  });

  it("is hidden (404) from users who aren't admin", async () => {
    role = "reader";
    await expect(saveBlogPost({}, form(VALID))).rejects.toBeInstanceOf(NotFoundSignal);
    expect(write()).toBeUndefined();
  });
});

describe("delete a blog post", () => {
  it("deletes it, removes its cover photo and refreshes the blog", async () => {
    writeResult = { data: [{ id: "post-1", cover_photo_url: `${BUCKET}cover.jpg` }] };
    await expect(deleteBlogPost("post-1", "hanoi")).rejects.toMatchObject({ url: "/admin" });
    expect(fake.storageRemove).toHaveBeenCalledWith(["cover.jpg"]);
    expect(revalidatePath).toHaveBeenCalledWith("/blog/hanoi");
  });
});
