// Browser-only: check, resize and upload one photo to the public blog bucket
// (admin-only by storage policy). Returns the public URL.
import { resizeImage } from "@/lib/resize-image";
import { createClient } from "@/lib/supabase/client";

const MAX_ORIGINAL_BYTES = 40 * 1024 * 1024;

export async function uploadPublicPhoto(file: File): Promise<{ url: string } | { error: string }> {
  if (!file.type.startsWith("image/") && !/\.(heic|heif)$/i.test(file.name)) {
    return { error: `${file.name} isn't a photo.` };
  }
  if (file.size > MAX_ORIGINAL_BYTES) return { error: `${file.name} is too large (over 40 MB).` };

  let blob: Blob;
  try {
    blob = await resizeImage(file);
  } catch {
    return { error: `Couldn't read ${file.name}. Try a JPG or PNG.` };
  }

  const storage = createClient().storage.from("recipe-photos");
  const path = `${crypto.randomUUID()}.jpg`;
  const { error } = await storage.upload(path, blob, { cacheControl: "31536000", contentType: "image/jpeg" });
  if (error) return { error: `Upload failed: ${error.message}` };
  return { url: storage.getPublicUrl(path).data.publicUrl };
}
