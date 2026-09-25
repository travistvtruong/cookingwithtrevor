"use client";

import Image from "next/image";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

const MAX_BYTES = 5 * 1024 * 1024;
const TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"];

// Uploads straight from the browser to Supabase Storage (admin-only by RLS),
// then stores the public URL in a hidden input submitted with the form.
export function PhotoUpload({ defaultUrl, error }: { defaultUrl: string; error?: string }) {
  const [url, setUrl] = useState(defaultUrl);
  const [status, setStatus] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!TYPES.includes(file.type)) return setStatus("Use a JPG, PNG, WebP or AVIF image.");
    if (file.size > MAX_BYTES) return setStatus("Image must be 5 MB or smaller.");

    setUploading(true);
    setStatus(null);
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${crypto.randomUUID()}.${ext}`;
    const storage = createClient().storage.from("recipe-photos");

    const { error: uploadError } = await storage.upload(path, file, {
      cacheControl: "31536000",
      contentType: file.type,
    });
    setUploading(false);
    if (uploadError) return setStatus(`Upload failed: ${uploadError.message}`);

    setUrl(storage.getPublicUrl(path).data.publicUrl);
  }

  return (
    <div className="space-y-2">
      <span className="text-sm font-medium text-stone-700">Photo</span>
      <input type="hidden" name="photo_url" value={url} />
      {url && (
        <div className="relative aspect-[3/2] w-full max-w-sm overflow-hidden rounded-md bg-stone-100">
          <Image src={url} alt="Recipe photo preview" fill sizes="384px" className="object-cover" />
        </div>
      )}
      <div className="flex items-center gap-3">
        <label className="cursor-pointer rounded-md border border-stone-300 bg-white px-3 py-1.5 text-sm font-medium text-stone-800 hover:bg-stone-50">
          {uploading ? "Uploading…" : url ? "Replace photo" : "Upload photo"}
          <input
            type="file"
            accept={TYPES.join(",")}
            onChange={handleFile}
            disabled={uploading}
            className="sr-only"
          />
        </label>
        {url && (
          <button
            type="button"
            onClick={() => setUrl("")}
            className="text-sm text-stone-600 hover:underline"
          >
            Remove
          </button>
        )}
      </div>
      {(status || error) && <p className="text-sm text-red-700">{status || error}</p>}
    </div>
  );
}
