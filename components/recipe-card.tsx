import Image from "next/image";
import Link from "next/link";
import { formatMinutes, totalMinutes, type RecipeSummary } from "@/lib/recipes";

export function RecipeCard({ recipe, preload }: { recipe: RecipeSummary; preload?: boolean }) {
  const total = totalMinutes(recipe);

  return (
    <Link
      href={`/recipes/${recipe.slug}`}
      className="group block overflow-hidden rounded-lg border border-stone-200 bg-white"
    >
      <div className="relative aspect-[4/3] bg-stone-100">
        {recipe.photo_url && (
          <Image
            src={recipe.photo_url}
            alt=""
            fill
            preload={preload}
            sizes="(min-width: 1024px) 320px, (min-width: 640px) 50vw, 100vw"
            className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
          />
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
