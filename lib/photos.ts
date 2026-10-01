import type { SupabaseClient } from "@supabase/supabase-js";

// recipes.photo_url holds one of two things:
// - Blog posts: a public URL in the "recipe-photos" bucket (admin uploads).
// - Private library recipes: a path "<user id>/<uuid>.jpg" in the PRIVATE
//   "user-photos" bucket, shown through short-lived signed URLs.

export const PUBLIC_BUCKET = "recipe-photos";
export const PRIVATE_BUCKET = "user-photos";

const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
const PRIVATE_PATH = new RegExp(`^${UUID}/${UUID}\\.jpg$`);

export type PhotoRef = { bucket: typeof PUBLIC_BUCKET | typeof PRIVATE_BUCKET; path: string };

const publicPrefix = () =>
  `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${PUBLIC_BUCKET}/`;

export function isPrivatePhoto(value: string | null | undefined): boolean {
  return !!value && PRIVATE_PATH.test(value);
}

// True when `value` is a photo path inside this user's own private folder.
export function isOwnPrivatePhoto(value: string, userId: string) {
  return isPrivatePhoto(value) && value.startsWith(`${userId}/`);
}

// Where a stored photo lives, or null if it isn't one of ours (never touch
// anything we don't own).
export function photoRef(value: string | null | undefined): PhotoRef | null {
  if (!value) return null;
  if (isPrivatePhoto(value)) return { bucket: PRIVATE_BUCKET, path: value };
  if (!value.startsWith(publicPrefix())) return null;
  const path = decodeURIComponent(value.slice(publicPrefix().length));
  return path && !path.includes("..") && !path.includes("/") ? { bucket: PUBLIC_BUCKET, path } : null;
}

// Back-compat helper: the path of a public blog photo.
export function photoPath(url: string | null | undefined): string | null {
  const ref = photoRef(url);
  return ref?.bucket === PUBLIC_BUCKET ? ref.path : null;
}

// Best effort: a leftover file is untidy, not broken, so failures only log.
export async function removePhoto(supabase: SupabaseClient, value: string | null | undefined) {
  const ref = photoRef(value);
  if (!ref) return;
  const { error } = await supabase.storage.from(ref.bucket).remove([ref.path]);
  if (error) console.warn(`Could not remove old photo ${ref.path}: ${error.message}`);
}

const SIGNED_URL_SECONDS = 60 * 60;

// Turn stored photo values into URLs a browser can load: public URLs pass
// through; private paths get one-hour signed URLs (RLS: only the owner can sign).
export async function displayPhotoUrls(
  supabase: SupabaseClient,
  values: (string | null | undefined)[],
): Promise<Map<string, string>> {
  const urls = new Map<string, string>();
  const privatePaths = [...new Set(values.filter((v): v is string => isPrivatePhoto(v)))];

  for (const v of values) if (v && !isPrivatePhoto(v)) urls.set(v, v);
  if (privatePaths.length) {
    const { data } = await supabase.storage.from(PRIVATE_BUCKET).createSignedUrls(privatePaths, SIGNED_URL_SECONDS);
    for (const item of data ?? []) {
      if (item.path && item.signedUrl) urls.set(item.path, item.signedUrl);
    }
  }
  return urls;
}

// Signed (private) photo URLs skip Next's image optimizer so private images
// never land in the shared image cache; they're already resized on upload.
export function isSignedPhotoUrl(url: string) {
  return url.includes(`/storage/v1/object/sign/${PRIVATE_BUCKET}/`);
}
