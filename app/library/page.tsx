import type { Metadata } from "next";
import Link from "next/link";
import { NewCollectionForm, RenameCollectionForm } from "@/components/collection-forms";
import { DeleteButton } from "@/components/delete-button";
import { RecipeCard } from "@/components/recipe-card";
import { requireUser } from "@/lib/auth";
import { getCollections } from "@/lib/collections";
import { displayPhotoUrls } from "@/lib/photos";
import { getLibrary } from "@/lib/recipes";
import { deleteCollection } from "./collection-actions";

export const metadata: Metadata = {
  title: "My library",
  robots: { index: false },
};

export default async function LibraryPage({ searchParams }: PageProps<"/library">) {
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q.trim() : "";
  const tag = typeof params.tag === "string" ? params.tag : "";
  const collectionId = typeof params.collection === "string" ? params.collection : "";

  const { supabase, userId } = await requireUser();
  const [library, collections] = await Promise.all([
    getLibrary(supabase, userId),
    getCollections(supabase, userId),
  ]);
  const active = collections.find((c) => c.id === collectionId);
  const photoUrls = await displayPhotoUrls(supabase, library.map(({ recipe }) => recipe.photo_url));

  // A personal library is small, so filter here rather than in SQL.
  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  const results = library.filter(
    ({ recipe }) =>
      (!tag || recipe.tags.includes(tag)) &&
      (!active || active.recipeIds.includes(recipe.id)) &&
      words.every((w) => recipe.title.toLowerCase().includes(w)),
  );
  const allTags = [...new Set(library.flatMap(({ recipe }) => recipe.tags))].sort();

  const tagHref = (t: string) => {
    const sp = new URLSearchParams();
    if (q) sp.set("q", q);
    if (active) sp.set("collection", active.id);
    if (t && t !== tag) sp.set("tag", t);
    const s = sp.toString();
    return s ? `/library?${s}` : "/library";
  };

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:py-12">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-semibold tracking-tight text-stone-900">My library</h1>
        <div className="flex flex-wrap gap-2">
          {library.length > 0 && (
            <Link
              href="/grocery/new"
              className="rounded-full border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-800 hover:bg-stone-50"
            >
              Make a grocery list
            </Link>
          )}
          <Link
            href="/library/new"
            className="rounded-full bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark"
          >
            Add a recipe
          </Link>
        </div>
      </div>

      {library.length === 0 ? (
        <div className="mt-8 rounded-lg border border-dashed border-stone-300 p-8 text-center text-stone-600">
          <p>Your library is empty.</p>
          <p className="mt-2">
            Save recipes from the{" "}
            <Link href="/" className="font-medium text-brand underline">
              blog
            </Link>{" "}
            or{" "}
            <Link href="/library/new" className="font-medium text-brand underline">
              add your own
            </Link>
            .
          </p>
        </div>
      ) : (
        <>
          <section aria-labelledby="collections-heading" className="mt-6 space-y-3">
            <h2 id="collections-heading" className="text-sm font-bold uppercase tracking-wider text-stone-600">
              Collections
            </h2>
            {collections.length > 0 && (
              <nav aria-label="Collections" className="flex flex-wrap gap-2">
                {[{ id: "", name: "All recipes", count: library.length }, ...collections.map((c) => ({ ...c, count: c.recipeIds.length }))].map((c) => {
                  const current = c.id === (active?.id ?? "");
                  return (
                    <Link
                      key={c.id || "all"}
                      href={c.id ? `/library?collection=${c.id}` : "/library"}
                      aria-current={current ? "page" : undefined}
                      className={
                        current
                          ? "rounded-full bg-ink px-3 py-1 text-sm font-semibold text-white"
                          : "rounded-full border border-stone-300 bg-white px-3 py-1 text-sm text-stone-700 hover:bg-stone-50"
                      }
                    >
                      {c.name} <span className={current ? "text-stone-300" : "text-stone-500"}>{c.count}</span>
                    </Link>
                  );
                })}
              </nav>
            )}
            {active ? (
              <div className="flex flex-wrap items-start gap-4 rounded-2xl border border-stone-200 bg-white p-4">
                <RenameCollectionForm key={active.id} collectionId={active.id} name={active.name} />
                <DeleteButton
                  action={deleteCollection.bind(null, active.id)}
                  label="Delete collection"
                  confirmMessage={`Delete the collection "${active.name}"? Its recipes stay in your library.`}
                />
              </div>
            ) : (
              <NewCollectionForm />
            )}
          </section>

          <form action="/library" className="mt-6 flex gap-2">
            {tag && <input type="hidden" name="tag" value={tag} />}
            {active && <input type="hidden" name="collection" value={active.id} />}
            <label htmlFor="q" className="sr-only">Search by name</label>
            <input
              id="q"
              name="q"
              type="search"
              defaultValue={q}
              placeholder="Search by name"
              className="w-full max-w-md rounded-md border border-stone-300 bg-white px-3 py-2 text-base text-stone-900 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
            />
            <button
              type="submit"
              className="rounded-full border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-800 hover:bg-stone-50"
            >
              Search
            </button>
          </form>

          {allTags.length > 0 && (
            <nav aria-label="Filter by tag" className="mt-4 flex flex-wrap gap-2">
              {allTags.map((t) => (
                <Link
                  key={t}
                  href={tagHref(t)}
                  aria-current={t === tag ? "true" : undefined}
                  className={
                    t === tag
                      ? "rounded-full bg-brand px-3 py-1 text-sm text-white"
                      : "rounded-full border border-stone-300 bg-white px-3 py-1 text-sm text-stone-700 hover:bg-stone-50"
                  }
                >
                  {t}
                </Link>
              ))}
            </nav>
          )}

          {results.length === 0 ? (
            <p className="mt-8 text-stone-600">
              {active && active.recipeIds.length === 0
                ? "This collection is empty. Open a recipe and tick the collection to add it. "
                : "No recipes match. "}
              <Link href="/library" className="font-medium text-brand underline">
                Clear filters
              </Link>
            </p>
          ) : (
            <ul className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {results.map(({ recipe }) => (
                <li key={recipe.id}>
                  <RecipeCard
                    recipe={{ ...recipe, photo_url: (recipe.photo_url && photoUrls.get(recipe.photo_url)) || null }}
                    href={`/library/${recipe.id}`}
                    badge={recipe.is_public ? undefined : "Private"}
                  />
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </main>
  );
}
