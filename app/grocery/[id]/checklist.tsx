"use client";

import { useState } from "react";
import { formatIngredient } from "@/lib/ingredients";
import { createClient } from "@/lib/supabase/client";

type Item = {
  id: string;
  name: string;
  quantity: number | null;
  unit: string | null;
  checked: boolean;
};

// Ticks update on screen immediately and save in the background, so the list
// stays quick on a phone with weak signal. RLS limits updates to the user's own lists.
export function Checklist({ initialItems }: { initialItems: Item[] }) {
  const [items, setItems] = useState(initialItems);
  const [error, setError] = useState(false);

  async function toggle(id: string) {
    const item = items.find((i) => i.id === id);
    if (!item) return;
    const checked = !item.checked;
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, checked } : i)));
    setError(false);

    const { error } = await createClient().from("grocery_list_items").update({ checked }).eq("id", id);
    if (error) {
      // Put it back so the screen matches what's saved.
      setItems((prev) => prev.map((i) => (i.id === id ? { ...i, checked: !checked } : i)));
      setError(true);
    }
  }

  const todo = items.filter((i) => !i.checked);
  const done = items.filter((i) => i.checked);

  const row = (item: Item) => (
    <li key={item.id}>
      <label className="flex min-h-14 cursor-pointer items-center gap-4 px-4 py-3 active:bg-stone-100">
        <input
          type="checkbox"
          checked={item.checked}
          onChange={() => toggle(item.id)}
          className="h-6 w-6 shrink-0 accent-orange-600"
        />
        <span className={item.checked ? "text-stone-400 line-through" : "text-lg text-stone-900"}>
          {formatIngredient(item)}
        </span>
      </label>
    </li>
  );

  return (
    <div className="space-y-6">
      <p className="text-sm text-stone-600" aria-live="polite">
        {todo.length === 0 ? "All done ✓" : `${todo.length} of ${items.length} left`}
      </p>
      {error && (
        <p role="alert" className="text-sm text-red-700">
          Couldn&apos;t save that change. Check your connection and try again.
        </p>
      )}

      {todo.length > 0 && (
        <ul className="divide-y divide-stone-200 rounded-lg border border-stone-200 bg-white">
          {todo.map(row)}
        </ul>
      )}

      {done.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-medium text-stone-500">In the cart</h2>
          <ul className="divide-y divide-stone-200 rounded-lg border border-stone-200 bg-white">
            {done.map(row)}
          </ul>
        </section>
      )}
    </div>
  );
}
