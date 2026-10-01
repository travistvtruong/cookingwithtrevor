"use client";

import { useState, useTransition } from "react";
import { setInCollection } from "@/app/library/collection-actions";
import { NewCollectionForm } from "./collection-forms";

type Option = { id: string; name: string; checked: boolean };

// On a recipe's library page: tick the collections it belongs to.
// Ticks update straight away and roll back if saving fails.
export function CollectionPicker({ recipeId, collections }: { recipeId: string; collections: Option[] }) {
  const [options, setOptions] = useState(collections);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function toggle(id: string) {
    const next = !options.find((o) => o.id === id)?.checked;
    setOptions((prev) => prev.map((o) => (o.id === id ? { ...o, checked: next } : o)));
    setError(null);
    startTransition(async () => {
      const result = await setInCollection(id, recipeId, next);
      if (result.error) {
        setOptions((prev) => prev.map((o) => (o.id === id ? { ...o, checked: !next } : o)));
        setError(result.error);
      }
    });
  }

  return (
    <section aria-labelledby="collections-heading" className="space-y-3">
      <h2 id="collections-heading" className="text-lg font-semibold text-stone-900">
        Collections
      </h2>
      {options.length > 0 ? (
        <ul className="flex flex-wrap gap-2">
          {options.map((o) => (
            <li key={o.id}>
              <label
                className={`flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 text-sm has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-brand ${
                  o.checked ? "border-brand bg-brand-tint text-brand-dark" : "border-stone-300 bg-white text-stone-700"
                }`}
              >
                <input
                  type="checkbox"
                  checked={o.checked}
                  onChange={() => toggle(o.id)}
                  className="h-4 w-4 accent-brand"
                />
                {o.name}
              </label>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-stone-600">Group recipes into collections, like &ldquo;Weeknight dinners&rdquo;.</p>
      )}
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      <NewCollectionForm recipeId={recipeId} label="New collection for this recipe" />
    </section>
  );
}
