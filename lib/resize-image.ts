// Browser-only: shrink a photo before upload. Phone photos are often 3-12 MB and
// carry EXIF metadata (including GPS location); re-encoding through a canvas
// resizes them and drops that metadata.

const MAX_EDGE = 2000; // px on the longest side, enough for a full-width hero image
const QUALITY = 0.82;

export async function resizeImage(file: File): Promise<Blob> {
  // createImageBitmap applies the EXIF rotation, so portrait phone photos stay upright.
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  // JPEG encodes everywhere (Safari can't encode WebP from a canvas);
  // next/image still serves modern formats to visitors.
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", QUALITY),
  );
  if (!blob) throw new Error("Could not encode image");
  return blob;
}
