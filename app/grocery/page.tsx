import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Grocery lists", robots: { index: false } };

export default async function GroceryListsPage() {
  const { supabase, userId } = await requireUser("/grocery");
  const { data: lists, error } = await supabase
    .from("grocery_lists")
    .select("id, name, created_at, grocery_list_items (checked)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8 sm:py-12">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-semibold tracking-tight text-stone-900">Grocery lists</h1>
        <Link
          href="/grocery/new"
          className="rounded-full bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark"
        >
          New list
        </Link>
      </div>

      {lists.length === 0 ? (
        <p className="mt-8 rounded-lg border border-dashed border-stone-300 p-8 text-center text-stone-600">
          No lists yet. Pick recipes from your library to make one.
        </p>
      ) : (
        <ul className="mt-6 divide-y divide-stone-200 rounded-lg border border-stone-200 bg-white">
          {lists.map((list) => {
            const items = list.grocery_list_items as { checked: boolean }[];
            const left = items.filter((i) => !i.checked).length;
            return (
              <li key={list.id}>
                <Link href={`/grocery/${list.id}`} className="flex items-center justify-between gap-4 px-4 py-4 hover:bg-stone-50">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-stone-900">{list.name}</p>
                    <p className="text-sm text-stone-500">
                      {new Date(list.created_at).toLocaleDateString("en-US", { dateStyle: "medium" })}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm text-stone-600">
                    {left === 0 && items.length > 0 ? "Done ✓" : `${left} of ${items.length} left`}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
