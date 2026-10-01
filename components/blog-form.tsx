"use client";

import { useActionState, useState } from "react";
import type { BlogFormState, BlogFormValues } from "@/lib/blog-form";
import { slugify } from "@/lib/slugify";
import type { GalleryPhoto } from "@/lib/gallery";
import { DeleteButton } from "./delete-button";
import { GalleryUpload } from "./gallery-upload";
import { PhotoUpload } from "./photo-upload";

const inputClass =
  "w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-base text-stone-900 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30 aria-[invalid=true]:border-red-600";

type Props = {
  action: (state: BlogFormState, formData: FormData) => Promise<BlogFormState>;
  deleteAction?: () => Promise<{ error?: string }>;
  id?: string;
  savedSlug?: string;
  initial: BlogFormValues;
  gallery?: GalleryPhoto[];
};

export function BlogForm({ action, deleteAction, id, savedSlug, initial, gallery = [] }: Props) {
  const [state, formAction, pending] = useActionState(action, {});
  const [photoBusy, setPhotoBusy] = useState(false);
  const [galleryBusy, setGalleryBusy] = useState(false);
  const values = state.values ?? initial;
  const errors = state.fieldErrors ?? {};
  const isPublished = initial.is_public;

  const [slug, setSlug] = useState(values.slug);
  const [slugTouched, setSlugTouched] = useState(Boolean(values.slug));

  const field = (name: keyof BlogFormValues) => ({
    name,
    id: name,
    "aria-invalid": Boolean(errors[name]),
    "aria-describedby": errors[name] ? `${name}-error` : undefined,
  });
  const errorText = (name: keyof BlogFormValues) =>
    errors[name] && (
      <p id={`${name}-error`} className="text-sm text-red-700">
        {errors[name]}
      </p>
    );

  return (
    <form action={formAction} className="space-y-6">
      {id && <input type="hidden" name="id" value={id} />}
      {savedSlug && <input type="hidden" name="previous_slug" value={savedSlug} />}

      <div className="space-y-1">
        <label htmlFor="title" className="text-sm font-medium text-stone-700">Title</label>
        <input
          {...field("title")}
          defaultValue={values.title}
          required
          onChange={(e) => !slugTouched && setSlug(slugify(e.target.value))}
          className={inputClass}
        />
        {errorText("title")}
      </div>

      <div className="space-y-1">
        <label htmlFor="slug" className="text-sm font-medium text-stone-700">URL</label>
        <div className="flex items-center">
          <span className="mr-1 shrink-0 text-sm text-stone-500">/blog/</span>
          <input
            {...field("slug")}
            value={slug}
            onChange={(e) => {
              setSlug(e.target.value);
              setSlugTouched(true);
            }}
            className={inputClass}
          />
        </div>
        {errorText("slug")}
      </div>

      <PhotoUpload
        mode="public"
        defaultUrl={values.cover_photo_url}
        error={errors.cover_photo_url}
        onBusyChange={setPhotoBusy}
      />

      <GalleryUpload defaultPhotos={gallery} onBusyChange={setGalleryBusy} />

      <div className="space-y-1">
        <label htmlFor="excerpt" className="text-sm font-medium text-stone-700">
          Summary <span className="font-normal text-stone-500">(optional)</span>
        </label>
        <p className="text-xs text-stone-500">One or two sentences shown on cards and in search results.</p>
        <textarea {...field("excerpt")} defaultValue={values.excerpt} rows={2} maxLength={300} className={inputClass} />
        {errorText("excerpt")}
      </div>

      <div className="space-y-1">
        <label htmlFor="body" className="text-sm font-medium text-stone-700">Post</label>
        <p className="text-xs text-stone-500">
          Blank line between paragraphs. Start a line with &quot;## &quot; for a heading or &quot;- &quot; for a
          bullet point.
        </p>
        <textarea {...field("body")} defaultValue={values.body} rows={16} className={inputClass} />
        {errorText("body")}
      </div>

      <div className="space-y-1">
        <label htmlFor="tags" className="text-sm font-medium text-stone-700">Tags</label>
        <input {...field("tags")} defaultValue={values.tags} placeholder="travel, tips" className={inputClass} />
        <p className="text-xs text-stone-500">Separate with commas.</p>
        {errorText("tags")}
      </div>

      {state.error && (
        <p role="alert" className="text-sm text-red-700">{state.error}</p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-stone-200 pt-6">
        {/* Publish first so pressing Enter in a field publishes, matching the main action. */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            name="intent"
            value="publish"
            disabled={pending || photoBusy || galleryBusy}
            className="rounded-full bg-brand px-5 py-2.5 font-medium text-white hover:bg-brand-dark disabled:opacity-60"
          >
            {pending ? "Saving…" : isPublished ? "Update post" : "Publish"}
          </button>
          <button
            type="submit"
            name="intent"
            value="draft"
            disabled={pending || photoBusy || galleryBusy}
            className="rounded-full border border-stone-300 bg-white px-5 py-2.5 font-medium text-stone-800 hover:bg-stone-50 disabled:opacity-60"
          >
            {isPublished ? "Unpublish" : "Save draft"}
          </button>
        </div>
        {deleteAction && (
          <DeleteButton
            action={deleteAction}
            label="Delete post"
            confirmMessage="Delete this blog post permanently? This can't be undone."
          />
        )}
      </div>
    </form>
  );
}
