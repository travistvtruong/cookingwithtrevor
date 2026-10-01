import Image from "next/image";
import Link from "next/link";
import { isSignedPhotoUrl } from "@/lib/photos";
import { formatMinutes, totalMinutes } from "@/lib/recipes";

type CardRecipe = {
  title: string;
  slug: string;
  photo_url: string | null;
  prep_min: number | null;
  cook_min: number | null;
  tags: string[];
};

type Props = {
  recipe: CardRecipe;
  href?: string;
  badge?: string;
  preload?: boolean;
};

export function RecipeCard({ recipe, href, badge, preload }: Props) {
  const total = totalMinutes(recipe);

  return (
    <Link
      href={href ?? `/recipes/${recipe.slug}`}
      className="group block overflow-hidden rounded-lg border border-stone-200 bg-white"
    >
      <div className="relative aspect-[4/3] bg-stone-100">
        {recipe.photo_url ? (
          <Image
            src={recipe.photo_url}
            alt=""
            fill
            preload={preload}
            unoptimized={isSignedPhotoUrl(recipe.photo_url)}
            sizes="(min-width: 1024px) 320px, (min-width: 640px) 50vw, 100vw"
            className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-4xl text-stone-300" aria-hidden>
            🍳
          </div>
        )}
        {badge && (
          <span className="absolute left-2 top-2 rounded-full bg-white/90 px-2 py-0.5 text-xs font-medium text-stone-700">
            {badge}
          </span>
        )}
      </div>
      <div className="space-y-1 p-4">
        <h2 className="font-semibold text-stone-900 group-hover:text-orange-700">{recipe.title}</h2>
        <p className="text-sm text-stone-600">
          {[total && formatMinutes(total), recipe.tags.slice(0, 2).join(" · ")]
            .filter(Boolean)
            .join(" · ")}
        </p>
      </div>
    </Link>
  );
}
