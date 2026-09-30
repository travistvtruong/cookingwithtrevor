"use client";

import { useActionState, useState } from "react";
import type { RecipeFormState, RecipeFormValues } from "@/lib/recipe-form";
import { slugify } from "@/lib/slugify";
import { DeleteButton } from "./delete-button";
import { PhotoUpload } from "./photo-upload";

const inputClass =
  "w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-base text-stone-900 focus:border-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-600/30 aria-[invalid=true]:border-red-600";

type Props = {
  // "post": blog post (URL, photo, publish buttons). "private": a library recipe.
  variant: "post" | "private";
  action: (state: RecipeFormState, formData: FormData) => Promise<RecipeFormState>;
  deleteAction?: () => Promise<{ error?: string }>;
  id?: string;
  savedSlug?: string;
  initial: RecipeFormValues;
};

export function RecipeForm({ variant, action, deleteAction, id, savedSlug, initial }: Props) {
  const isPost = variant === "post";
  const [state, formAction, pending] = useActionState(action, {});
  const values = state.values ?? initial;
  const errors = state.fieldErrors ?? {};
  // Button labels follow the saved status, not an unsaved attempt.
  const isPublished = initial.is_public;

  // Suggest a slug from the title until the author edits the slug themselves.
  const [slug, setSlug] = useState(values.slug);
  const [slugTouched, setSlugTouched] = useState(Boolean(values.slug));

  const field = (name: keyof RecipeFormValues) => ({
    name,
    id: name,
    "aria-invalid": Boolean(errors[name]),
    "aria-describedby": errors[name] ? `${name}-error` : undefined,
  });
  const errorText = (name: keyof RecipeFormValues) =>
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
          onChange={(e) => isPost && !slugTouched && setSlug(slugify(e.target.value))}
          className={inputClass}
        />
        {errorText("title")}
      </div>

      {isPost && (
        <>
          <div className="space-y-1">
            <label htmlFor="slug" className="text-sm font-medium text-stone-700">URL</label>
            <div className="flex items-center rounded-md">
              <span className="mr-1 shrink-0 text-sm text-stone-500">/recipes/</span>
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

          <PhotoUpload defaultUrl={values.photo_url} error={errors.photo_url} />
        </>
      )}

      <div className="space-y-1">
        <label htmlFor="intro" className="text-sm font-medium text-stone-700">
          {isPost ? "Intro" : "Description"}
        </label>
        <p className="text-xs text-stone-500">
          {isPost ? "Keep it short. Leave a blank line between paragraphs." : "Optional."}
        </p>
        <textarea {...field("intro")} defaultValue={values.intro} rows={4} className={inputClass} />
        {errorText("intro")}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {(
          [
            ["prep_min", "Prep (minutes)"],
            ["cook_min", "Cook (minutes)"],
            ["servings", "Servings"],
          ] as const
        ).map(([name, label]) => (
          <div key={name} className="space-y-1">
            <label htmlFor={name} className="text-sm font-medium text-stone-700">{label}</label>
            <input
              {...field(name)}
              defaultValue={values[name]}
              type="number"
              inputMode="numeric"
              min={name === "servings" ? 1 : 0}
              className={inputClass}
            />
            {errorText(name)}
          </div>
        ))}
      </div>

      <div className="space-y-1">
        <label htmlFor="tags" className="text-sm font-medium text-stone-700">Tags</label>
        <input
          {...field("tags")}
          defaultValue={values.tags}
          placeholder="dinner, chicken, quick"
          className={inputClass}
        />
        <p className="text-xs text-stone-500">Separate with commas.</p>
        {errorText("tags")}
      </div>

      <div className="space-y-1">
        <label htmlFor="ingredients" className="text-sm font-medium text-stone-700">Ingredients</label>
        <p className="text-xs text-stone-500">
          One per line, amount first: &quot;1 1/2 cups flour&quot;, &quot;3 eggs&quot;, &quot;salt to taste&quot;.
        </p>
        <textarea
          {...field("ingredients")}
          defaultValue={values.ingredients}
          rows={8}
          className={`${inputClass} font-mono text-sm`}
        />
        {errorText("ingredients")}
      </div>

      <div className="space-y-1">
        <label htmlFor="steps" className="text-sm font-medium text-stone-700">Steps</label>
        <p className="text-xs text-stone-500">One step per line.</p>
        <textarea {...field("steps")} defaultValue={values.steps} rows={8} className={inputClass} />
        {errorText("steps")}
      </div>

      {state.error && (
        <p role="alert" className="text-sm text-red-700">{state.error}</p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-stone-200 pt-6">
        {isPost ? (
          // Publish comes first so pressing Enter in a field publishes, matching the main action.
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              name="intent"
              value="publish"
              disabled={pending}
              className="rounded-md bg-orange-600 px-5 py-2.5 font-medium text-white hover:bg-orange-700 disabled:opacity-60"
            >
              {pending ? "Saving…" : isPublished ? "Update post" : "Publish"}
            </button>
            <button
              type="submit"
              name="intent"
              value="draft"
              disabled={pending}
              className="rounded-md border border-stone-300 bg-white px-5 py-2.5 font-medium text-stone-800 hover:bg-stone-50 disabled:opacity-60"
            >
              {isPublished ? "Unpublish" : "Save draft"}
            </button>
          </div>
        ) : (
          <button
            type="submit"
            disabled={pending}
            className="rounded-md bg-orange-600 px-5 py-2.5 font-medium text-white hover:bg-orange-700 disabled:opacity-60"
          >
            {pending ? "Saving…" : "Save recipe"}
          </button>
        )}
        {deleteAction && (
          <DeleteButton
            action={deleteAction}
            label={isPost ? "Delete post" : "Delete recipe"}
            confirmMessage={`Delete this ${isPost ? "post" : "recipe"} permanently? This can't be undone.`}
          />
        )}
      </div>
    </form>
  );
}
