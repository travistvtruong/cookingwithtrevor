import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { GalleryPhoto } from "@/lib/gallery";
import { removePhoto } from "@/lib/photos";

export type PostParent = { recipeId: string } | { blogPostId: string };

const parentColumn = (p: PostParent) =>
  "recipeId" in p ? (["recipe_id", p.recipeId] as const) : (["blog_post_id", p.blogPostId] as const);

// A post's extra photos in display order. Empty until the post_photos
// migration has run (missing table), so pages never break because of it.
export async function getPostPhotos(supabase: SupabaseClient, parent: PostParent): Promise<GalleryPhoto[]> {
  const [column, id] = parentColumn(parent);
  const { data, error } = await supabase
    .from("post_photos")
    .select("url, caption")
    .eq(column, id)
    .order("position");
  if (error) {
    if (error.code === "PGRST205" || error.code === "42P01") return [];
    throw error;
  }
  return (data ?? []) as GalleryPhoto[];
}

// Replace a post's gallery (one transaction in the database), then delete the
// files that were removed, unless one of them is now the post's main photo.
export async function savePostPhotos(
  supabase: SupabaseClient,
  parent: PostParent,
  photos: GalleryPhoto[],
  mainPhotoUrl: string | null,
): Promise<{ error?: string }> {
  const { data, error } = await supabase.rpc("set_post_photos", {
    p_recipe_id: "recipeId" in parent ? parent.recipeId : null,
    p_blog_post_id: "blogPostId" in parent ? parent.blogPostId : null,
    p_photos: photos,
  });
  if (error) {
    // Before the migration, posts still save; only the extra photos are skipped.
    if (error.code === "PGRST202" || error.code === "42883") {
      return photos.length ? { error: "Extra photos aren't set up yet: run the post photos migration." } : {};
    }
    return { error: `The post saved, but its extra photos didn't: ${error.message}` };
  }
  for (const { removed_url } of (data ?? []) as { removed_url: string }[]) {
    if (removed_url !== mainPhotoUrl) await removePhoto(supabase, removed_url);
  }
  return {};
}

// Before deleting a post: remember its gallery files so they can be removed
// from storage afterwards (the rows themselves go with the post).
export async function galleryUrls(supabase: SupabaseClient, parent: PostParent): Promise<string[]> {
  return (await getPostPhotos(supabase, parent)).map((p) => p.url);
}
