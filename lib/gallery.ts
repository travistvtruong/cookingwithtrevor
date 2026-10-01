import { z } from "zod";
import { PUBLIC_BUCKET, photoRef } from "@/lib/photos";

// Extra photos under a post's main photo ("More photos" in the dashboard).

export type GalleryPhoto = { url: string; caption: string };

export const MAX_GALLERY = 12;
export const MAX_CAPTION = 200;

const gallerySchema = z
  .array(
    z.object({
      url: z.string().refine((v) => photoRef(v)?.bucket === PUBLIC_BUCKET, "Upload photos using the button."),
      caption: z.string().trim().max(MAX_CAPTION, `Keep captions under ${MAX_CAPTION} characters.`).default(""),
    }),
  )
  .max(MAX_GALLERY, `Up to ${MAX_GALLERY} extra photos per post.`)
  // The same photo twice is almost certainly a double upload.
  .transform((photos) => photos.filter((p, i) => photos.findIndex((q) => q.url === p.url) === i));

// The form sends the gallery as JSON in a hidden "gallery" field.
export function readGallery(formData: FormData): { photos: GalleryPhoto[] } | { error: string } {
  const raw = formData.get("gallery");
  if (raw === null || raw === "") return { photos: [] };
  let json: unknown;
  try {
    json = JSON.parse(String(raw));
  } catch {
    return { error: "The photo list couldn't be read. Please try again." };
  }
  const parsed = gallerySchema.safeParse(json);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  return { photos: parsed.data };
}
