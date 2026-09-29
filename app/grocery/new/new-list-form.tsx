"use client";

import { useActionState, useState } from "react";
import { createGroceryList, type NewListState } from "../actions";

type Option = { id: string; title: string };

export function NewListForm({ recipes, preselected }: { recipes: Option[]; preselected: string[] }) {
  const [state, formAction, pending] = useActionState<NewListState, FormData>(createGroceryList, {});
  const [selected, setSelected] = useState(() => new Set(preselected));

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <form action={formAction} className="space-y-6">
      <fieldset>
        <legend className="text-sm font-medium text-stone-700">Recipes</legend>
        <ul className="mt-2 divide-y divide-stone-200 rounded-lg border border-stone-200 bg-white">
          {recipes.map((r) => (
            <li key={r.id}>
              <label className="flex cursor-pointer items-center gap-3 px-4 py-3 hover:bg-stone-50">
                <input
                  type="checkbox"
                  name="recipe"
                  value={r.id}
                  checked={selected.has(r.id)}
                  onChange={() => toggle(r.id)}
                  className="h-5 w-5 accent-orange-600"
                />
                <span className="text-stone-900">{r.title}</span>
              </label>
            </li>
          ))}
        </ul>
      </fieldset>

      <div className="space-y-1">
        <label htmlFor="name" className="text-sm font-medium text-stone-700">List name</label>
        <input
          id="name"
          name="name"
          maxLength={100}
          placeholder="Named after the recipes if left blank"
          className="w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-base text-stone-900 focus:border-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-600/30"
        />
      </div>

      {state.error && <p role="alert" className="text-sm text-red-700">{state.error}</p>}

      <button
        type="submit"
        disabled={pending || selected.size === 0}
        className="w-full rounded-md bg-orange-600 px-5 py-3 font-medium text-white hover:bg-orange-700 disabled:opacity-60 sm:w-auto"
      >
        {pending
          ? "Making your list…"
          : `Make grocery list${selected.size ? ` (${selected.size} recipe${selected.size > 1 ? "s" : ""})` : ""}`}
      </button>
    </form>
  );
}
