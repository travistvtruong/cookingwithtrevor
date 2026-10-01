"use client";

import Image from "next/image";
import { useState } from "react";
import { resizeImage } from "@/lib/resize-image";
import { createClient } from "@/lib/supabase/client";

// Generous limit for the original; what's uploaded is the resized copy (well under 5 MB).
const MAX_ORIGINAL_BYTES = 40 * 1024 * 1024;

type Status = "idle" | "resizing" | "uploading";

// Photo section of the recipe form. Resizes on the device, then uploads straight
// to Supabase Storage and stores the result in a hidden "photo_url" input.
// - "public" (blog posts): admin-only bucket; stores the public URL.
// - "private" (library recipes): the user's own folder in a private bucket;
//   stores the path, and previews via a signed URL or the local file.
export function PhotoUpload({
  mode = "public",
  defaultUrl,
  defaultPreview,
  error,
  onBusyChange,
}: {
  mode?: "public" | "private";
  defaultUrl: string; // the stored value (public URL or private path)
  defaultPreview?: string; // a loadable URL for private photos (signed)
  error?: string;
  onBusyChange?: (busy: boolean) => void; // lets the form hold off saving mid-upload
}) {
  const [url, setUrl] = useState(defaultUrl);
  const [preview, setPreview] = useState(mode === "private" ? defaultPreview ?? "" : defaultUrl);
  const [status, setStatusState] = useState<Status>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const busy = status !== "idle";

  function setStatus(next: Status) {
    setStatusState(next);
    onBusyChange?.(next !== "idle");
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow picking the same file again
    if (!file) return;
    if (!file.type.startsWith("image/") && !/\.(heic|heif)$/i.test(file.name)) {
      return setMessage("That file isn't a photo.");
    }
    if (file.size > MAX_ORIGINAL_BYTES) return setMessage("That photo is too large (over 40 MB).");

    setMessage(null);
    setStatus("resizing");
    let blob: Blob;
    try {
      blob = await resizeImage(file);
    } catch {
      setStatus("idle");
      return setMessage("Couldn't read that photo. Try a JPG or PNG, or take a new one.");
    }

    setStatus("uploading");
    const supabase = createClient();
    let path = `${crypto.randomUUID()}.jpg`;
    if (mode === "private") {
      // Storage policy: users may only write inside the folder named after their id.
      const { data } = await supabase.auth.getSession();
      const userId = data.session?.user.id;
      if (!userId) {
        setStatus("idle");
        return setMessage("Your session expired. Sign in again to upload photos.");
      }
      path = `${userId}/${path}`;
    }
    const storage = supabase.storage.from(mode === "private" ? "user-photos" : "recipe-photos");
    const { error: uploadError } = await storage.upload(path, blob, {
      cacheControl: "31536000",
      contentType: "image/jpeg",
    });
    setStatus("idle");
    if (uploadError) return setMessage(`Upload failed: ${uploadError.message}`);

    if (mode === "private") {
      setUrl(path);
      setPreview(URL.createObjectURL(blob)); // show the local copy; no extra download
    } else {
      const publicUrl = storage.getPublicUrl(path).data.publicUrl;
      setUrl(publicUrl);
      setPreview(publicUrl);
    }
  }

  const buttonClass =
    "flex min-h-11 cursor-pointer items-center justify-center rounded-md border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-800 hover:bg-stone-50 has-[:disabled]:cursor-default has-[:disabled]:opacity-60 has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-orange-700";

  return (
    <section
      aria-labelledby="photo-heading"
      className="space-y-4 rounded-lg border border-stone-200 bg-white p-4 sm:p-5"
    >
      <div>
        <h2 id="photo-heading" className="text-lg font-semibold text-stone-900">Photo</h2>
        <p className="text-sm text-stone-600">
          {mode === "private"
            ? "Only you can see this photo. "
            : "The main photo at the top of the post. Landscape works best. "}
          It&apos;s resized on your device and location data is removed before upload.
        </p>
      </div>

      <input type="hidden" name="photo_url" value={url} />

      <div className="relative aspect-[3/2] w-full overflow-hidden rounded-md bg-stone-100">
        {url && preview ? (
          <Image
            src={preview}
            alt="Recipe photo preview"
            fill
            sizes="(min-width: 672px) 640px, 100vw"
            // Private previews (signed or local URLs) bypass the shared image optimizer.
            unoptimized={mode === "private"}
            className="object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-stone-500">
            {url ? "Photo saved (preview unavailable)" : "No photo yet"}
          </div>
        )}
        {busy && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/70 text-sm font-medium text-stone-800">
            {status === "resizing" ? "Preparing photo…" : "Uploading…"}
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-3">
        {/* Camera button only on touch devices; desktops would just open a file picker. */}
        <label className={`${buttonClass} hidden pointer-coarse:flex`}>
          Take photo
          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFile}
            disabled={busy}
            className="sr-only"
          />
        </label>
        <label className={buttonClass}>
          {url ? "Replace photo" : "Choose photo"}
          <input type="file" accept="image/*" onChange={handleFile} disabled={busy} className="sr-only" />
        </label>
        {url && !busy && (
          <button
            type="button"
            onClick={() => {
              setUrl("");
              setPreview("");
            }}
            className="min-h-11 px-2 text-sm text-stone-600 hover:underline"
          >
            Remove
          </button>
        )}
      </div>

      <p aria-live="polite" className="text-sm text-red-700">{message || error}</p>
    </section>
  );
}
