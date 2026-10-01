import type { Metadata } from "next";
import Image from "next/image";
import { Reviews as Comments } from "@/components/comments";
import { PhotoGallery } from "@/components/photo-gallery";
import { RecipeDetails } from "@/components/recipe-details";
import { SaveButton } from "@/components/save-button";
import { Stars } from "@/components/stars";
import { formatIngredient } from "@/lib/ingredients";
import { formatMinutes, postPath, totalMinutes, type Recipe } from "@/lib/recipes";

// The public page for a post: a recipe (/recipes/<slug>) or a food review
// (/reviews/<slug>). Both share the layout, photo, write-up and comments.
export function PostView({ post }: { post: Recipe }) {
  const isReview = post.kind === "review";
  const total = totalMinutes(post);
  const path = postPath(post);

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:py-12">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(post) }} />

      <article>
        <header className="space-y-4">
          <p className="inline-block rounded-full bg-brand-soft px-3 py-1 text-xs font-bold uppercase tracking-wider text-brand-dark">
            {isReview ? "Review" : "Recipe"}
          </p>
          <h1 className="text-3xl font-extrabold leading-tight tracking-tight text-ink sm:text-5xl">
            {post.title}
          </h1>

          {isReview && (
            <div className="space-y-1">
              <p className="text-lg font-semibold text-ink">
                {post.place_name}
                {post.place_location && (
                  <span className="font-normal text-stone-600"> · {post.place_location}</span>
                )}
              </p>
              {post.my_rating && (
                <p className="flex items-center gap-2 text-stone-700">
                  <Stars value={post.my_rating} className="text-xl" />
                  <span className="text-sm">My rating: {post.my_rating}/5</span>
                </p>
              )}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-stone-600">
            {post.rating && (
              <a
                href="#reviews"
                aria-label={`Readers rated it ${post.rating.average} out of 5 from ${post.rating.count} ratings`}
                className="hover:underline"
              >
                <span className="text-brand">★</span> {post.rating.average} ({post.rating.count})
              </a>
            )}
            {!isReview && total && <span>{formatMinutes(total)}</span>}
            {post.tags.length > 0 && <span>{post.tags.join(" · ")}</span>}
          </div>

          {!isReview && (
            <div className="flex flex-wrap items-center gap-3">
              <a
                href="#recipe"
                className="rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark"
              >
                Jump to recipe ↓
              </a>
              <SaveButton recipeId={post.id} slug={post.slug} />
            </div>
          )}
        </header>

        {post.photo_url && (
          <div className="relative mt-8 aspect-[3/2] overflow-hidden rounded-2xl bg-stone-100">
            <Image
              src={post.photo_url}
              alt={post.title}
              fill
              preload
              fetchPriority="high"
              sizes="(min-width: 768px) 736px, calc(100vw - 32px)"
              className="object-cover"
            />
          </div>
        )}

        {post.intro && (
          <div className="mt-8 space-y-4 text-lg leading-relaxed text-stone-800">
            {post.intro.split(/\n\s*\n/).map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
        )}

        {/* Reviews: photos right after the write-up. Recipes: after the recipe card. */}
        {isReview && <PhotoGallery photos={post.photos} title={post.title} />}

        {!isReview && (
          <div className="mt-10">
            <RecipeDetails {...post} anchorId="recipe" />
          </div>
        )}

        {!isReview && <PhotoGallery photos={post.photos} title={post.title} />}

        <Comments recipeId={post.id} path={path} reviews={post.reviews} rating={post.rating} />
      </article>
    </main>
  );
}

export function postMetadata(post: Recipe | null): Metadata {
  if (!post) return {};
  const description = summary(post);
  return {
    title: post.title,
    description,
    alternates: { canonical: postPath(post) },
    openGraph: {
      type: "article",
      title: post.title,
      description,
      images: post.photo_url ? [post.photo_url] : [],
    },
  };
}

// schema.org data so search engines can show rich results:
// Recipe for recipes, Review (of a restaurant/dish) for reviews.
function jsonLd(post: Recipe) {
  const aggregateRating = post.rating
    ? { "@type": "AggregateRating", ratingValue: post.rating.average, ratingCount: post.rating.count }
    : undefined;
  const allPhotos = [post.photo_url, ...post.photos.map((p) => p.url)].filter(Boolean);
  const image = allPhotos.length ? allPhotos : undefined;

  let data: Record<string, unknown>;
  if (post.kind === "review") {
    data = {
      "@context": "https://schema.org",
      "@type": "Review",
      name: post.title,
      reviewBody: post.intro || undefined,
      image,
      datePublished: post.published_at ?? undefined,
      author: { "@type": "Person", name: "Trevor" },
      itemReviewed: {
        "@type": "Restaurant",
        name: post.place_name,
        address: post.place_location || undefined,
      },
      reviewRating: post.my_rating
        ? { "@type": "Rating", ratingValue: post.my_rating, bestRating: 5, worstRating: 1 }
        : undefined,
    };
  } else {
    const iso = (min: number | null) => (min != null ? `PT${min}M` : undefined);
    data = {
      "@context": "https://schema.org",
      "@type": "Recipe",
      name: post.title,
      description: summary(post),
      image,
      datePublished: post.published_at ?? undefined,
      prepTime: iso(post.prep_min),
      cookTime: iso(post.cook_min),
      totalTime: iso(totalMinutes(post)),
      recipeYield: post.servings ? String(post.servings) : undefined,
      keywords: post.tags.join(", ") || undefined,
      recipeIngredient: post.ingredients.map(formatIngredient),
      recipeInstructions: post.steps.map((s) => ({ "@type": "HowToStep", text: s.text })),
      aggregateRating,
    };
  }
  // Escape "<" so post text can never close the script tag.
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

// Search-result description: the write-up's first paragraph, or one built from
// the post when there's none.
export function summary(post: Recipe) {
  const intro = post.intro.split(/\n\s*\n/)[0].trim();
  if (intro) return intro.length > 160 ? `${intro.slice(0, 157).trimEnd()}…` : intro;

  if (post.kind === "review") {
    return [`Review of ${post.place_name}`, post.place_location && ` in ${post.place_location}`, post.my_rating && `: ${post.my_rating}/5`, "."]
      .filter(Boolean)
      .join("");
  }
  const total = totalMinutes(post);
  const count = post.ingredients.length;
  return [
    `${post.title} recipe with ${count} ingredient${count === 1 ? "" : "s"}`,
    total && `, ready in ${formatMinutes(total)}`,
    ".",
  ]
    .filter(Boolean)
    .join("");
}
