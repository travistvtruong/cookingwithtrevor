"use client";

import Image from "next/image";
import { useState } from "react";
import { MAX_CAPTION, MAX_GALLERY, type GalleryPhoto } from "@/lib/gallery";
import { uploadPublicPhoto } from "@/lib/upload-public-photo";

// "More photos" section of the post forms: add several photos (resized on the
// device), caption, reorder and remove them. Submitted as JSON in "gallery".
export function GalleryUpload({
  defaultPhotos,
  error,
  onBusyChange,
}: {
  defaultPhotos: GalleryPhoto[];
  error?: string;
  onBusyChange?: (busy: boolean) => void;
}) {
  const [photos, setPhotos] = useState(defaultPhotos);
  const [progress, setProgress] = useState<string | null>(null);
  const [messages, setMessages] = useState<string[]>([]);
  const busy = progress !== null;
  const room = MAX_GALLERY - photos.length;

  async function addFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = [...(e.target.files ?? [])];
    e.target.value = "";
    if (!files.length) return;

    const accepted = files.slice(0, room);
    const problems: string[] = [];
    if (files.length > room) problems.push(`Only ${MAX_GALLERY} extra photos per post; skipped ${files.length - room}.`);

    onBusyChange?.(true);
    // One at a time keeps memory use low on phones and shows clear progress.
    for (const [i, file] of accepted.entries()) {
      setProgress(`Uploading ${i + 1} of ${accepted.length}…`);
      const result = await uploadPublicPhoto(file);
      if ("error" in result) problems.push(result.error);
      else setPhotos((prev) => [...prev, { url: result.url, caption: "" }]);
    }
    setProgress(null);
    setMessages(problems);
    onBusyChange?.(false);
  }

  const move = (from: number, to: number) =>
    setPhotos((prev) => {
      if (to < 0 || to >= prev.length) return prev;
      const next = [...prev];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });

  const buttonClass =
    "flex min-h-11 cursor-pointer items-center justify-center rounded-full border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-800 hover:bg-stone-50 has-[:disabled]:cursor-default has-[:disabled]:opacity-60 has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-brand";
  const smallButton =
    "min-h-9 min-w-9 rounded-full border border-stone-300 bg-white px-2 text-sm text-stone-700 hover:bg-stone-50 disabled:opacity-40";

  return (
    <section
      aria-labelledby="gallery-heading"
      className="space-y-4 rounded-lg border border-stone-200 bg-white p-4 sm:p-5"
    >
      <div>
        <h2 id="gallery-heading" className="text-lg font-semibold text-stone-900">
          More photos <span className="text-sm font-normal text-stone-500">(optional, up to {MAX_GALLERY})</span>
        </h2>
        <p className="text-sm text-stone-600">Shown in a grid under the post. Add captions and use the arrows to reorder.</p>
      </div>

      <input type="hidden" name="gallery" value={JSON.stringify(photos)} />

      {photos.length > 0 && (
        <ol className="space-y-3">
          {photos.map((p, i) => (
            <li key={p.url} className="flex gap-3 rounded-md border border-stone-200 p-2">
              <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded bg-stone-100">
                <Image src={p.url} alt={p.caption || `Photo ${i + 1}`} fill sizes="80px" className="object-cover" />
              </div>
              <div className="min-w-0 flex-1 space-y-2">
                <label className="block">
                  <span className="sr-only">Caption for photo {i + 1}</span>
                  <input
                    value={p.caption}
                    maxLength={MAX_CAPTION}
                    placeholder="Caption (optional)"
                    onChange={(e) =>
                      setPhotos((prev) => prev.map((q, j) => (j === i ? { ...q, caption: e.target.value } : q)))
                    }
                    className="w-full rounded-md border border-stone-300 bg-white px-2 py-1.5 text-sm text-stone-900 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
                  />
                </label>
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => move(i, i - 1)} disabled={i === 0} className={smallButton} aria-label={`Move photo ${i + 1} up`}>
                    ↑
                  </button>
                  <button type="button" onClick={() => move(i, i + 1)} disabled={i === photos.length - 1} className={smallButton} aria-label={`Move photo ${i + 1} down`}>
                    ↓
                  </button>
                  <button
                    type="button"
                    onClick={() => setPhotos((prev) => prev.filter((_, j) => j !== i))}
                    className={`${smallButton} px-3`}
                  >
                    Remove
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}

      {room > 0 && (
        <div className="flex flex-wrap gap-3">
          <label className={`${buttonClass} hidden pointer-coarse:flex`}>
            Take photo
            <input type="file" accept="image/*" capture="environment" onChange={addFiles} disabled={busy} className="sr-only" />
          </label>
          <label className={buttonClass}>
            {photos.length ? "Add more photos" : "Choose photos"}
            <input type="file" accept="image/*" multiple onChange={addFiles} disabled={busy} className="sr-only" />
          </label>
        </div>
      )}

      <div aria-live="polite" className="space-y-1 text-sm">
        {progress && <p className="text-stone-700">{progress}</p>}
        {[...messages, ...(error ? [error] : [])].map((m) => (
          <p key={m} className="text-red-700">{m}</p>
        ))}
      </div>
    </section>
  );
}
