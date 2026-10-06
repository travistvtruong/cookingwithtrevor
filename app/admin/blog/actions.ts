"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { readBlogForm, validateBlogPost, type BlogFormState } from "@/lib/blog-form";
import { readGallery } from "@/lib/gallery";
import { removePhoto } from "@/lib/photos";
import { galleryUrls, savePostPhotos } from "@/lib/post-photos";

// Refresh every cached page a blog post can appear on. The whole site is
// refreshed because the header's Blog link depends on whether posts exist.
function revalidateBlog(...slugs: string[]) {
  revalidatePath("/", "layout");
  revalidatePath("/");
  revalidatePath("/blog");
  for (const slug of new Set(slugs.filter(Boolean))) revalidatePath(`/blog/${slug}`);
}

export async function saveBlogPost(_prev: BlogFormState, formData: FormData): Promise<BlogFormState> {
  const { supabase } = await requireAdmin();
  const id = String(formData.get("id") ?? "") || null;
  const previousSlug = String(formData.get("previous_slug") ?? "");
  const values = readBlogForm(formData);

  const result = validateBlogPost(values);
  if ("state" in result) return result.state;
  const post = result.data;
  const gallery = readGallery(formData);
  if ("error" in gallery) return { error: gallery.error, values };

  // Remember the current cover so a replaced or removed one can be cleaned up.
  const previousCover = id
    ? ((await supabase.from("blog_posts").select("cover_photo_url").eq("id", id).maybeSingle()).data
        ?.cover_photo_url as string | null | undefined) ?? null
    : null;

  const query = id
    ? supabase.from("blog_posts").update(post).eq("id", id).select("id, slug")
    : supabase.from("blog_posts").insert(post).select("id, slug");
  const { data, error } = await query;

  if (error) {
    if (error.code === "23505") return { fieldErrors: { slug: "Another blog post already uses this URL." }, values };
    return { error: `Could not save: ${error.message}`, values };
  }
  const saved = (data as { id: string; slug: string }[])[0];
  if (!saved) return { error: "Could not save: the post wasn't found or you don't have access.", values };

  if (previousCover && previousCover !== post.cover_photo_url) await removePhoto(supabase, previousCover);

  const photos = await savePostPhotos(supabase, { blogPostId: saved.id }, gallery.photos, post.cover_photo_url);
  if (photos.error) {
    revalidateBlog(saved.slug, previousSlug);
    return { error: photos.error, values };
  }

  revalidateBlog(saved.slug, previousSlug);
  redirect("/admin");
}

export async function deleteBlogPost(id: string, slug: string): Promise<{ error?: string }> {
  const { supabase } = await requireAdmin();
  const extraPhotos = await galleryUrls(supabase, { blogPostId: id }); // rows go with the post; files don't
  // RLS blocks silently (0 rows, no error), so check that a row was actually deleted.
  const { data, error } = await supabase.from("blog_posts").delete().eq("id", id).select("id, cover_photo_url");
  if (error) return { error: `Could not delete the post: ${error.message}` };
  const deleted = data as { id: string; cover_photo_url: string | null }[];
  if (!deleted.length) return { error: "Could not delete the post: it wasn't found or you don't have access." };

  await removePhoto(supabase, deleted[0].cover_photo_url);
  for (const url of extraPhotos) await removePhoto(supabase, url);
  revalidateBlog(slug);
  redirect("/admin");
}
