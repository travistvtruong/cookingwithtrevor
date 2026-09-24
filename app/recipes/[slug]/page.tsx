import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { formatIngredient } from "@/lib/ingredients";
import { formatMinutes, getPublishedRecipe, totalMinutes, type Recipe } from "@/lib/recipes";

// Pages are built on first visit, cached, and rebuilt when the post is saved.
export const revalidate = 3600;

export async function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }: PageProps<"/recipes/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const recipe = await getPublishedRecipe(slug);
  if (!recipe) return {};

  const description = recipe.intro.split(/\n\s*\n/)[0].slice(0, 160);
  return {
    title: recipe.title,
    description,
    alternates: { canonical: `/recipes/${recipe.slug}` },
    openGraph: {
      type: "article",
      title: recipe.title,
      description,
      images: recipe.photo_url ? [recipe.photo_url] : [],
    },
  };
}

export default async function RecipePage({ params }: PageProps<"/recipes/[slug]">) {
  const { slug } = await params;
  const recipe = await getPublishedRecipe(slug);
  if (!recipe) notFound();

  const total = totalMinutes(recipe);
  const facts = [
    recipe.prep_min != null && ["Prep", formatMinutes(recipe.prep_min)],
    recipe.cook_min != null && ["Cook", formatMinutes(recipe.cook_min)],
    total && ["Total", formatMinutes(total)],
    recipe.servings && ["Serves", String(recipe.servings)],
  ].filter(Boolean) as [string, string][];

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:py-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(recipe) }}
      />

      <article>
        <header className="space-y-4">
          <h1 className="text-3xl font-semibold tracking-tight text-stone-900 sm:text-4xl">
            {recipe.title}
          </h1>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-stone-600">
            {recipe.rating && (
              <span aria-label={`Rated ${recipe.rating.average} out of 5`}>
                <span className="text-orange-600">★</span> {recipe.rating.average} ({recipe.rating.count})
              </span>
            )}
            {total && <span>{formatMinutes(total)}</span>}
            {recipe.tags.length > 0 && <span>{recipe.tags.join(" · ")}</span>}
          </div>
          <a
            href="#recipe"
            className="inline-block rounded-md bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700"
          >
            Jump to recipe ↓
          </a>
        </header>

        {recipe.photo_url && (
          <div className="relative mt-6 aspect-[3/2] overflow-hidden rounded-lg bg-stone-100">
            <Image
              src={recipe.photo_url}
              alt={recipe.title}
              fill
              preload
              sizes="(min-width: 768px) 736px, 100vw"
              className="object-cover"
            />
          </div>
        )}

        {recipe.intro && (
          <div className="mt-6 space-y-4 leading-relaxed text-stone-700">
            {recipe.intro.split(/\n\s*\n/).map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
        )}

        <section
          id="recipe"
          className="mt-10 scroll-mt-4 rounded-lg border border-stone-200 bg-white p-5 sm:p-8"
        >
          <h2 className="text-2xl font-semibold text-stone-900">{recipe.title}</h2>

          {facts.length > 0 && (
            <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {facts.map(([label, value]) => (
                <div key={label} className="rounded-md bg-stone-50 px-3 py-2">
                  <dt className="text-xs uppercase tracking-wide text-stone-500">{label}</dt>
                  <dd className="font-medium text-stone-900">{value}</dd>
                </div>
              ))}
            </dl>
          )}

          <h3 className="mt-8 text-lg font-semibold text-stone-900">Ingredients</h3>
          <ul className="mt-3 space-y-2">
            {recipe.ingredients.map((ing) => (
              <li key={ing.position} className="flex gap-3 text-stone-800">
                <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-orange-600" />
                {formatIngredient(ing)}
              </li>
            ))}
          </ul>

          <h3 className="mt-8 text-lg font-semibold text-stone-900">Steps</h3>
          <ol className="mt-3 space-y-4">
            {recipe.steps.map((step, i) => (
              <li key={step.position} className="flex gap-4 text-stone-800">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-orange-100 text-sm font-semibold text-orange-800">
                  {i + 1}
                </span>
                <p className="pt-0.5 leading-relaxed">{step.text}</p>
              </li>
            ))}
          </ol>
        </section>
      </article>
    </main>
  );
}

// schema.org Recipe data so search engines can show rich results.
function jsonLd(recipe: Recipe) {
  const iso = (min: number | null) => (min != null ? `PT${min}M` : undefined);
  const total = totalMinutes(recipe);
  const data = {
    "@context": "https://schema.org",
    "@type": "Recipe",
    name: recipe.title,
    description: recipe.intro.split(/\n\s*\n/)[0],
    image: recipe.photo_url ? [recipe.photo_url] : undefined,
    datePublished: recipe.published_at ?? undefined,
    prepTime: iso(recipe.prep_min),
    cookTime: iso(recipe.cook_min),
    totalTime: iso(total),
    recipeYield: recipe.servings ? String(recipe.servings) : undefined,
    keywords: recipe.tags.join(", ") || undefined,
    recipeIngredient: recipe.ingredients.map(formatIngredient),
    recipeInstructions: recipe.steps.map((s) => ({ "@type": "HowToStep", text: s.text })),
    aggregateRating: recipe.rating
      ? { "@type": "AggregateRating", ratingValue: recipe.rating.average, ratingCount: recipe.rating.count }
      : undefined,
  };
  // Escape "<" so recipe text can never close the script tag.
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
