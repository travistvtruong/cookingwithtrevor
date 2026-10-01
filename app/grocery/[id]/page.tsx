import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ConfirmSubmit } from "@/components/confirm-submit";
import { requireUser } from "@/lib/auth";
import { deleteGroceryList } from "../actions";
import { Checklist } from "./checklist";

export const metadata: Metadata = { title: "Grocery list", robots: { index: false } };

export default async function GroceryListPage({ params }: PageProps<"/grocery/[id]">) {
  const { id } = await params;
  const { supabase, userId } = await requireUser(`/grocery/${id}`);

  const { data: list } = await supabase
    .from("grocery_lists")
    .select("id, name, created_at, grocery_list_items (id, position, name, quantity, unit, checked)")
    .eq("id", id)
    .eq("user_id", userId)
    .order("position", { referencedTable: "grocery_list_items" })
    .maybeSingle();
  if (!list) notFound();

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6 sm:py-10">
      <Link href="/grocery" className="inline-block py-1.5 text-sm text-brand hover:underline">
        ← Grocery lists
      </Link>
      <h1 className="mb-4 mt-3 text-2xl font-semibold text-stone-900">{list.name}</h1>

      <Checklist initialItems={list.grocery_list_items} />

      <form action={deleteGroceryList.bind(null, list.id)} className="mt-10 border-t border-stone-200 pt-6">
        <ConfirmSubmit
          message="Delete this grocery list?"
          className="text-sm font-medium text-red-700 hover:underline"
        >
          Delete list
        </ConfirmSubmit>
      </form>
    </main>
  );
}
