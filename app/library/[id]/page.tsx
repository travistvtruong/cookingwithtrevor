import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CollectionPicker } from "@/components/collection-picker";
import { DeleteButton } from "@/components/delete-button";
import { RecipeDetails } from "@/components/recipe-details";
import { requireUser } from "@/lib/auth";
import { getCollections } from "@/lib/collections";
import type { Ingredient } from "@/lib/ingredients";
import { displayPhotoUrls, isSignedPhotoUrl } from "@/lib/photos";
import { deleteMyRecipe, removeFromLibrary } from "../actions";
import { NotesForm } from "./notes-form";

export const metadata: Metadata = { title: "My library", robots: { index: false } };

type SavedRecipe = {
  notes: string;
  recipe: {
    id: string;
    title: string;
    slug: string;
    intro: string;
    photo_url: string | null;
    prep_min: number | null;
    cook_min: number | null;
    servings: number | null;
    tags: string[];
    is_public: boolean;
    author_id: string;
    ingredients: (Ingredient & { position: number })[];
    steps: { position: number; text: string }[];
  } | null;
};

export default async function LibraryRecipePage({ params }: PageProps<"/library/[id]">) {
  const { id } = await params;
  const { supabase, userId } = await requireUser(`/library/${id}`);

  const { data } = await supabase
    .from("saved_recipes")
    .select(
      `notes,
       recipe:recipes (
         id, title, slug, intro, photo_url, prep_min, cook_min, servings, tags, is_public, author_id,
         ingredients (position, quantity, unit, name),
         steps (position, text)
       )`,
    )
    .eq("user_id", userId)
    .eq("recipe_id", id)
    .maybeSingle<SavedRecipe>();
  const recipe = data?.recipe;
  if (!recipe) notFound();

  recipe.ingredients.sort((a, b) => a.position - b.position);
  recipe.steps.sort((a, b) => a.position - b.position);
  const isOwnPrivate = recipe.author_id === userId && !recipe.is_public;
  const collections = await getCollections(supabase, userId);
  const photo = recipe.photo_url
    ? (await displayPhotoUrls(supabase, [recipe.photo_url])).get(recipe.photo_url)
    : undefined;

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:py-12">
      <Link href="/library" className="inline-block py-1.5 text-sm text-brand hover:underline print:hidden">
        ← My library
      </Link>

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm print:hidden">
        {isOwnPrivate ? (
          <>
            <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs font-medium text-stone-700">
              Private
            </span>
            <Link href={`/library/${recipe.id}/edit`} className="inline-block py-1.5 font-medium text-brand hover:underline">
              Edit recipe
            </Link>
          </>
        ) : (
          <Link href={`/recipes/${recipe.slug}`} className="inline-block py-1.5 font-medium text-brand hover:underline">
            View blog post
          </Link>
        )}
        <Link
          href={`/grocery/new?recipe=${recipe.id}`}
          className="inline-block py-1.5 font-medium text-brand hover:underline"
        >
          Make grocery list
        </Link>
        {recipe.tags.length > 0 && <span className="text-stone-600">{recipe.tags.join(" · ")}</span>}
      </div>

      {photo && (
        <div className="relative mt-4 aspect-[3/2] overflow-hidden rounded-lg bg-stone-100">
          <Image
            src={photo}
            alt={recipe.title}
            fill
            preload
            // Private photos use signed URLs and skip the shared image optimizer.
            unoptimized={isSignedPhotoUrl(photo)}
            sizes="(min-width: 768px) 736px, calc(100vw - 32px)"
            className="object-cover"
          />
        </div>
      )}

      {recipe.intro && (
        <div className="mt-4 space-y-3 leading-relaxed text-stone-700">
          {recipe.intro.split(/\n\s*\n/).map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
      )}

      <div className="mt-6">
        <RecipeDetails {...recipe} titleAs="h1" />
      </div>

      <div className="mt-8 print:hidden">
        <NotesForm recipeId={recipe.id} notes={data.notes} />
      </div>

      <div className="mt-8 print:hidden">
        <CollectionPicker
          // Remount when collections change (e.g. one was just created) to pick up new props.
          key={collections.map((c) => `${c.id}:${c.recipeIds.includes(recipe.id)}`).join()}
          recipeId={recipe.id}
          collections={collections.map((c) => ({ id: c.id, name: c.name, checked: c.recipeIds.includes(recipe.id) }))}
        />
      </div>

      <div className="mt-10 border-t border-stone-200 pt-6 print:hidden">
        {isOwnPrivate ? (
          <DeleteButton
            action={deleteMyRecipe.bind(null, recipe.id)}
            label="Delete recipe"
            confirmMessage="Delete this recipe permanently? This can't be undone."
          />
        ) : (
          <form action={removeFromLibrary.bind(null, recipe.id)}>
            <button type="submit" className="text-sm font-medium text-red-700 hover:underline">
              Remove from library
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
