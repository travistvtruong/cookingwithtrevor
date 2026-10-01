import { beforeEach, describe, expect, it, vi } from "vitest";
import { RedirectSignal, fakeSupabase, type Call } from "../fake-supabase";
import { photoPath, photoRef } from "@/lib/photos";

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
import { deleteMyRecipe, saveMyRecipe } from "@/app/library/actions";

const BUCKET_URL = "https://test-project.supabase.co/storage/v1/object/public/recipe-photos/";
const OLD = `${BUCKET_URL}old.jpg`;
const NEW = `${BUCKET_URL}new.jpg`;

const ME = "11111111-1111-4111-8111-111111111111";
const PRIVATE_OLD = `${ME}/44444444-4444-4444-8444-444444444444.jpg`;
const PRIVATE_NEW = `${ME}/55555555-5555-4555-8555-555555555555.jpg`;

describe("photoRef", () => {
  it("knows which bucket a stored photo lives in", () => {
    expect(photoRef(OLD)).toEqual({ bucket: "recipe-photos", path: "old.jpg" });
    expect(photoRef(PRIVATE_OLD)).toEqual({ bucket: "user-photos", path: PRIVATE_OLD });
    expect(photoRef(`${ME}/not-a-uuid.jpg`)).toBeNull();
    expect(photoRef(`${BUCKET_URL}nested/x.jpg`)).toBeNull();
  });
});

describe("photoPath", () => {
  it("extracts the path for photos in our bucket only", () => {
    expect(photoPath(OLD)).toBe("old.jpg");
    expect(photoPath("https://evil.example/recipe-photos/old.jpg")).toBeNull();
    expect(photoPath(`${BUCKET_URL}../avatars/x.jpg`)).toBeNull();
    expect(photoPath("")).toBeNull();
    expect(photoPath(null)).toBeNull();
  });
});

function form(photo: string) {
  const fd = new FormData();
  const fields = {
    id: "recipe-1",
    previous_slug: "mango",
    title: "Mango",
    slug: "mango",
    intro: "",
    photo_url: photo,
    prep_min: "",
    cook_min: "",
    servings: "",
    tags: "",
    ingredients: "1 mango",
    steps: "Eat it.",
    intent: "publish",
  };
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
}

let fake: ReturnType<typeof fakeSupabase>;
let savedPhoto: string | null = OLD;

beforeEach(() => {
  savedPhoto = OLD;
  fake = fakeSupabase((call: Call) => {
    if (call.table === "profiles") return { data: { role: "admin" } };
    if (call.table === "recipes" && call.op === "select") return { data: { photo_url: savedPhoto } };
    if (call.table === "recipes" && call.op === "delete") return { data: [{ id: "recipe-1", photo_url: savedPhoto }] };
    if (call.rpc === "save_recipe") return { data: { id: "recipe-1", slug: "mango" } };
    return { data: null };
  });
  supabase.current = fake.client;
});

describe("photo cleanup in the dashboard", () => {
  it("removes the old file when a post's photo is replaced", async () => {
    await expect(saveRecipe({}, form(NEW))).rejects.toBeInstanceOf(RedirectSignal);
    expect(fake.storageRemove).toHaveBeenCalledWith(["old.jpg"]);
  });

  it("removes the old file when the photo is removed", async () => {
    await expect(saveRecipe({}, form(""))).rejects.toBeInstanceOf(RedirectSignal);
    expect(fake.storageRemove).toHaveBeenCalledWith(["old.jpg"]);
  });

  it("leaves the file alone when the photo didn't change", async () => {
    await expect(saveRecipe({}, form(OLD))).rejects.toBeInstanceOf(RedirectSignal);
    expect(fake.storageRemove).not.toHaveBeenCalled();
  });

  it("removes the photo when a post is deleted", async () => {
    await expect(deleteRecipe("recipe-1", "mango")).rejects.toMatchObject({ url: "/admin" });
    expect(fake.storageRemove).toHaveBeenCalledWith(["old.jpg"]);
  });

  it("still finishes the delete if removing the file fails", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    fake.storageRemove.mockResolvedValueOnce({ data: [], error: { message: "storage down" } });
    await expect(deleteRecipe("recipe-1", "mango")).rejects.toMatchObject({ url: "/admin" });
  });

  it("never touches files outside our bucket", async () => {
    savedPhoto = "https://elsewhere.example/photo.jpg";
    await expect(deleteRecipe("recipe-1", "mango")).rejects.toBeInstanceOf(RedirectSignal);
    expect(fake.storageRemove).not.toHaveBeenCalled();
  });
});

describe("photo cleanup for private library recipes", () => {
  beforeEach(() => {
    savedPhoto = PRIVATE_OLD;
    fake.client.auth.getClaims.mockResolvedValue({ data: { claims: { sub: ME } }, error: null } as never);
  });

  it("removes the old private file when the photo is replaced", async () => {
    await expect(saveMyRecipe({}, form(PRIVATE_NEW))).rejects.toBeInstanceOf(RedirectSignal);
    expect(fake.calls.find((c) => c.table === "storage:user-photos")?.payload).toEqual([PRIVATE_OLD]);
  });

  it("removes the private file when the recipe is deleted", async () => {
    await expect(deleteMyRecipe("recipe-1")).rejects.toMatchObject({ url: "/library" });
    expect(fake.calls.find((c) => c.table === "storage:user-photos")?.payload).toEqual([PRIVATE_OLD]);
  });
});
