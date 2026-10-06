"use client";

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { formatIngredient } from "@/lib/ingredients";
import {
  isNetworkError,
  parsePending,
  pendingSnapshot,
  readPending,
  subscribePending,
  writePending,
} from "@/lib/offline";
import { groupBySection } from "@/lib/store-sections";
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
// Items still to buy are grouped by store section (R10).
// Offline (R11): a tick that can't reach the server stays ticked and is queued
// in this browser, then saved when the connection comes back.
export function Checklist({ initialItems }: { initialItems: Item[] }) {
  const [saved, setSaved] = useState(initialItems);
  const [error, setError] = useState(false);
  // Ticks queued while offline (localStorage), shown on top of what's saved.
  const pendingRaw = useSyncExternalStore(subscribePending, pendingSnapshot, () => "{}");
  const pending = useMemo(() => parsePending(pendingRaw), [pendingRaw]);
  const items = saved.map((i) => (i.id in pending ? { ...i, checked: pending[i.id] } : i));
  const waiting = saved.filter((i) => i.id in pending).length;

  const save = useCallback(async (id: string, checked: boolean) => {
    const { error } = await createClient().from("grocery_list_items").update({ checked }).eq("id", id);
    return error;
  }, []);

  // Send ticks queued while offline. Ones for other lists stay queued until
  // that list is opened.
  const flush = useCallback(async () => {
    const queue = readPending();
    for (const item of initialItems.filter((i) => i.id in queue)) {
      const checked = queue[item.id];
      const err = await save(item.id, checked);
      if (err && isNetworkError(err)) break; // still offline: try again later
      if (err) setError(true); // refused (e.g. signed out): goes back to what's saved
      else setSaved((prev) => prev.map((i) => (i.id === item.id ? { ...i, checked } : i)));
      delete queue[item.id];
    }
    writePending(queue);
  }, [initialItems, save]);

  useEffect(() => {
    const first = setTimeout(flush, 0); // anything left from last time
    window.addEventListener("online", flush);
    return () => {
      clearTimeout(first);
      window.removeEventListener("online", flush);
    };
  }, [flush]);

  async function toggle(id: string) {
    const item = items.find((i) => i.id === id);
    if (!item) return;
    const checked = !item.checked;
    // Show it at once (as a queued tick), then save.
    writePending({ ...readPending(), [id]: checked });
    setError(false);

    const err = await save(id, checked);
    if (err && isNetworkError(err)) return; // stays queued until we're back online

    const queue = readPending();
    delete queue[id];
    writePending(queue);
    if (err) {
      setError(true); // refused by the server: the screen goes back to what's saved
      return;
    }
    setSaved((prev) => prev.map((i) => (i.id === id ? { ...i, checked } : i)));
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
          className="h-6 w-6 shrink-0 accent-brand"
        />
        <span className={item.checked ? "text-stone-500 line-through" : "text-lg text-stone-900"}>
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
      {waiting > 0 && (
        <p role="status" className="rounded-md bg-brand-tint px-3 py-2 text-sm text-brand-dark">
          You&apos;re offline. {waiting === 1 ? "1 tick" : `${waiting} ticks`} will save when you&apos;re back online.
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm text-red-700">
          Couldn&apos;t save that change. Try again.
        </p>
      )}

      {groupBySection(todo).map(({ section, items: sectionItems }) => (
        <section key={section}>
          <h2 className="mb-2 text-sm font-bold uppercase tracking-wider text-stone-600">{section}</h2>
          <ul className="divide-y divide-stone-200 rounded-lg border border-stone-200 bg-white">
            {sectionItems.map(row)}
          </ul>
        </section>
      ))}

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
