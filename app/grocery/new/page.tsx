import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getLibrary } from "@/lib/recipes";
import { NewListForm } from "./new-list-form";

export const metadata: Metadata = { title: "New grocery list", robots: { index: false } };

export default async function NewGroceryListPage({ searchParams }: PageProps<"/grocery/new">) {
  const params = await searchParams;
  const preselected = [params.recipe ?? []].flat().map(String);

  const { supabase, userId } = await requireUser("/grocery/new");
  const library = await getLibrary(supabase, userId);
  const recipes = library
    .map(({ recipe }) => ({ id: recipe.id, title: recipe.title }))
    .sort((a, b) => a.title.localeCompare(b.title));

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8 sm:py-12">
      <Link href="/grocery" className="text-sm text-brand hover:underline">
        ← Grocery lists
      </Link>
      <h1 className="mt-4 text-2xl font-semibold text-stone-900">New grocery list</h1>
      <p className="mb-6 mt-1 text-sm text-stone-600">
        Pick recipes and we&apos;ll combine their ingredients into one list.
      </p>

      {recipes.length === 0 ? (
        <p className="rounded-lg border border-dashed border-stone-300 p-8 text-center text-stone-600">
          Your library is empty.{" "}
          <Link href="/" className="font-medium text-brand underline">Save some recipes</Link> first.
        </p>
      ) : (
        <NewListForm
          recipes={recipes}
          preselected={preselected.filter((id) => recipes.some((r) => r.id === id))}
        />
      )}
    </main>
  );
}
