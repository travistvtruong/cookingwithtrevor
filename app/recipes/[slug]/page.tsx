import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { RecipeDetails } from "@/components/recipe-details";
import { SaveButton } from "@/components/save-button";
import { formatIngredient } from "@/lib/ingredients";
import { formatMinutes, getPublishedRecipe, totalMinutes, type Recipe } from "@/lib/recipes";
import { Reviews } from "./reviews";

// Pages are built on first visit, cached, and rebuilt when the post is saved.
// The 60s refresh picks up changes made on another server or in the database.
export const revalidate = 60;

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
              <a
                href="#reviews"
                aria-label={`Rated ${recipe.rating.average} out of 5 from ${recipe.rating.count} ratings`}
                className="hover:underline"
              >
                <span className="text-orange-600">★</span> {recipe.rating.average} ({recipe.rating.count})
              </a>
            )}
            {total && <span>{formatMinutes(total)}</span>}
            {recipe.tags.length > 0 && <span>{recipe.tags.join(" · ")}</span>}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <a
              href="#recipe"
              className="rounded-md bg-orange-700 px-4 py-2 text-sm font-medium text-white hover:bg-orange-800"
            >
              Jump to recipe ↓
            </a>
            <SaveButton recipeId={recipe.id} slug={recipe.slug} />
          </div>
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

        <div className="mt-10">
          <RecipeDetails {...recipe} anchorId="recipe" />
        </div>

        <Reviews
          recipeId={recipe.id}
          slug={recipe.slug}
          reviews={recipe.reviews}
          rating={recipe.rating}
        />
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
