import type { SupabaseClient } from "@supabase/supabase-js";

const BUCKET = "recipe-photos";

// ".../storage/v1/object/public/recipe-photos/<path>" -> "<path>", or null if the
// URL isn't a photo in our bucket (never delete anything we don't own).
export function photoPath(url: string | null | undefined): string | null {
  if (!url) return null;
  const prefix = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${BUCKET}/`;
  if (!url.startsWith(prefix)) return null;
  const path = decodeURIComponent(url.slice(prefix.length));
  return path && !path.includes("..") ? path : null;
}

// Best effort: a leftover file is untidy, not broken, so failures only log.
export async function removePhoto(supabase: SupabaseClient, url: string | null | undefined) {
  const path = photoPath(url);
  if (!path) return;
  const { error } = await supabase.storage.from(BUCKET).remove([path]);
  if (error) console.warn(`Could not remove old photo ${path}: ${error.message}`);
}
