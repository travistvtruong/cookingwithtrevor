import Image from "next/image";
import Link from "next/link";
import { Stars } from "@/components/stars";
import { isSignedPhotoUrl } from "@/lib/photos";
import { formatMinutes, postPath, totalMinutes } from "@/lib/recipes";
import type { PostKind } from "@/lib/recipe-form";

type CardPost = {
  kind?: PostKind;
  title: string;
  slug: string;
  photo_url: string | null;
  prep_min: number | null;
  cook_min: number | null;
  tags: string[];
  place_name?: string | null;
  my_rating?: number | null;
};

type Props = {
  recipe: CardPost;
  href?: string;
  badge?: string;
  preload?: boolean;
  size?: "default" | "large";
};

// Photo card with the title over the image (dark gradient keeps text readable).
export function RecipeCard({ recipe, href, badge, preload, size = "default" }: Props) {
  const kind = recipe.kind ?? "recipe";
  const total = totalMinutes(recipe);
  const isReview = kind === "review";
  const label = badge ?? (isReview ? "Review" : "Recipe");

  return (
    <Link
      href={href ?? postPath({ kind, slug: recipe.slug })}
      className={`group relative block overflow-hidden rounded-2xl bg-ink ${
        size === "large" ? "aspect-[4/5] sm:aspect-[16/11]" : "aspect-[4/5]"
      }`}
    >
      {recipe.photo_url ? (
        <Image
          src={recipe.photo_url}
          alt=""
          fill
          preload={preload}
          unoptimized={isSignedPhotoUrl(recipe.photo_url)}
          sizes={
            size === "large"
              ? "(min-width: 1024px) 680px, 100vw"
              : "(min-width: 1024px) 360px, (min-width: 640px) 50vw, 100vw"
          }
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center text-6xl opacity-30" aria-hidden>
          🍳
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent" />

      <span className="absolute left-4 top-4 rounded-full bg-white/95 px-3 py-1 text-xs font-bold uppercase tracking-wider text-ink">
        {label}
      </span>

      <div className="absolute inset-x-0 bottom-0 space-y-2 p-5 text-white">
        <h2
          className={`font-extrabold leading-tight tracking-tight ${
            size === "large" ? "text-2xl sm:text-4xl" : "text-xl"
          }`}
        >
          {recipe.title}
        </h2>
        <p className="flex flex-wrap items-center gap-x-2 text-sm text-white/90">
          {isReview ? (
            <>
              {recipe.my_rating ? <Stars value={recipe.my_rating} tone="text-brand-soft" /> : null}
              {recipe.place_name && <span>{recipe.place_name}</span>}
            </>
          ) : (
            [total && formatMinutes(total), recipe.tags.slice(0, 2).join(" · ")].filter(Boolean).join(" · ")
          )}
        </p>
        {size === "large" && (
          <span className="mt-2 inline-block rounded-full border-2 border-white px-5 py-2 text-sm font-semibold transition-colors group-hover:bg-white group-hover:text-ink">
            Read more
          </span>
        )}
      </div>
    </Link>
  );
}
