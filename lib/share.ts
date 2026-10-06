import { DEFAULT_SHARE_IMAGE } from "@/lib/share-image";

// Pinterest's "save" link: the page, its picture and a description.
export function pinterestUrl({ url, title, image }: { url: string; title: string; image: string }): string {
  const params = new URLSearchParams({ url, media: image, description: title });
  return `https://www.pinterest.com/pin/create/button/?${params}`;
}

// Absolute URL of the picture to share: the post's photo, or the default card.
export function shareImageUrl(photoUrl: string | null, base: string): string {
  if (!photoUrl) return `${base}${DEFAULT_SHARE_IMAGE.url}`;
  return photoUrl.startsWith("http") ? photoUrl : `${base}${photoUrl}`;
}
