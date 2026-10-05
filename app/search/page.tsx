import type { Metadata } from "next";
import { RecipeCard } from "@/components/recipe-card";
import { MAX_QUERY, MIN_QUERY, cleanQuery, searchPosts } from "@/lib/search";

// Results pages aren't useful in search engines.
export const metadata: Metadata = { title: "Search", robots: { index: false } };

const LABELS = { recipe: "Recipe", review: "Review", blog: "Blog" } as const;

export default async function SearchPage({ searchParams }: PageProps<"/search">) {
  const { q: raw } = await searchParams;
  const q = cleanQuery(raw);
  const results = await searchPosts(q);
  const tooShort = q.length > 0 && q.length < MIN_QUERY;

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:py-14">
      <h1 className="text-4xl font-extrabold tracking-tight text-ink sm:text-5xl">Search</h1>

      <form action="/search" role="search" className="mt-6 flex max-w-xl gap-2">
        <label htmlFor="q" className="sr-only">Search recipes, reviews and blog posts</label>
        <input
          id="q"
          name="q"
          type="search"
          defaultValue={q}
          maxLength={MAX_QUERY}
          placeholder="Tacos, mango, Hanoi…"
          autoFocus={!q}
          className="w-full rounded-full border border-stone-300 bg-white px-5 py-2.5 text-base text-stone-900 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
        />
        <button
          type="submit"
          className="shrink-0 rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark"
        >
          Search
        </button>
      </form>

      <div className="mt-10" aria-live="polite">
        {!q ? (
          <p className="text-stone-600">Search recipes, ingredients, restaurants and blog posts.</p>
        ) : tooShort ? (
          <p className="text-stone-600">Type at least {MIN_QUERY} characters.</p>
        ) : results.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-stone-300 p-10 text-center text-stone-600">
            Nothing found for &ldquo;{q}&rdquo;. Try a different word or an ingredient.
          </p>
        ) : (
          <>
            <p className="mb-6 text-sm text-stone-600">
              {results.length} {results.length === 1 ? "result" : "results"} for &ldquo;{q}&rdquo;
            </p>
            <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {results.map((r, i) => (
                <li key={`${r.kind}-${r.id}`}>
                  <RecipeCard
                    preload={i === 0}
                    href={r.href}
                    badge={LABELS[r.kind]}
                    recipe={{
                      kind: r.kind === "review" ? "review" : "recipe",
                      title: r.title,
                      slug: r.slug,
                      photo_url: r.photo_url,
                      prep_min: null,
                      cook_min: null,
                      tags: r.tags,
                      place_name: r.place_name,
                      my_rating: r.my_rating,
                    }}
                  />
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </main>
  );
}
