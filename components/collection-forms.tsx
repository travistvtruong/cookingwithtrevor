"use client";

import { useActionState, useEffect, useRef } from "react";
import {
  createCollection,
  renameCollection,
  type CollectionState,
} from "@/app/library/collection-actions";

const inputClass =
  "w-full min-w-0 rounded-full border border-stone-300 bg-white px-4 py-2 text-sm text-stone-900 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30";
const buttonClass =
  "shrink-0 rounded-full border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-stone-800 hover:bg-stone-50 disabled:opacity-60";

function Feedback({ state }: { state: CollectionState }) {
  return (
    <p aria-live="polite" className={state.error ? "text-sm text-red-700" : "text-sm text-green-700"}>
      {state.error ?? state.message}
    </p>
  );
}

// "New collection" box. With a recipeId, the recipe is added to it too.
export function NewCollectionForm({ recipeId, label = "New collection" }: { recipeId?: string; label?: string }) {
  const [state, formAction, pending] = useActionState(createCollection.bind(null, recipeId ?? null), {});
  const formRef = useRef<HTMLFormElement>(null);

  // Clear the box after a successful create.
  useEffect(() => {
    if (state.message) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="space-y-1">
      <div className="flex max-w-md gap-2">
        <label htmlFor={`new-collection-${recipeId ?? "library"}`} className="sr-only">
          {label}
        </label>
        <input
          id={`new-collection-${recipeId ?? "library"}`}
          name="name"
          required
          maxLength={60}
          placeholder={label}
          className={inputClass}
        />
        <button type="submit" disabled={pending} className={buttonClass}>
          {pending ? "Adding…" : recipeId ? "Create & add" : "Create"}
        </button>
      </div>
      <Feedback state={state} />
    </form>
  );
}

export function RenameCollectionForm({ collectionId, name }: { collectionId: string; name: string }) {
  const [state, formAction, pending] = useActionState(renameCollection.bind(null, collectionId), {});
  return (
    <form action={formAction} className="space-y-1">
      <div className="flex max-w-md gap-2">
        <label htmlFor="rename-collection" className="sr-only">Collection name</label>
        <input id="rename-collection" name="name" required maxLength={60} defaultValue={name} className={inputClass} />
        <button type="submit" disabled={pending} className={buttonClass}>
          {pending ? "Saving…" : "Rename"}
        </button>
      </div>
      <Feedback state={state} />
    </form>
  );
}
