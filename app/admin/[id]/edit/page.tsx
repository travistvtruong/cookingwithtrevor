import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { formatIngredient } from "@/lib/ingredients";
import { RecipeForm } from "../../recipe-form";

export default async function EditRecipePage({ params }: PageProps<"/admin/[id]/edit">) {
  const { id } = await params;
  const { supabase, userId } = await requireAdmin();

  const { data: recipe } = await supabase
    .from("recipes")
    .select(
      `id, title, slug, intro, photo_url, prep_min, cook_min, servings, tags, is_public,
       ingredients (position, quantity, unit, name),
       steps (position, text)`,
    )
    .eq("id", id)
    .eq("author_id", userId)
    .order("position", { referencedTable: "ingredients" })
    .order("position", { referencedTable: "steps" })
    .maybeSingle();
  if (!recipe) notFound();

  const num = (n: number | null) => (n == null ? "" : String(n));

  return (
    <main className="max-w-2xl">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold text-stone-900">Edit post</h1>
          <span
            className={
              recipe.is_public
                ? "rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800"
                : "rounded-full bg-stone-100 px-2 py-0.5 text-xs font-medium text-stone-700"
            }
          >
            {recipe.is_public ? "Published" : "Draft"}
          </span>
        </div>
        {recipe.is_public && (
          <Link href={`/recipes/${recipe.slug}`} className="text-sm text-orange-700 hover:underline">
            View post
          </Link>
        )}
      </div>
      <RecipeForm
        id={recipe.id}
        savedSlug={recipe.slug}
        initial={{
          title: recipe.title,
          slug: recipe.slug,
          intro: recipe.intro,
          photo_url: recipe.photo_url ?? "",
          prep_min: num(recipe.prep_min),
          cook_min: num(recipe.cook_min),
          servings: num(recipe.servings),
          tags: recipe.tags.join(", "),
          ingredients: recipe.ingredients.map(formatIngredient).join("\n"),
          steps: recipe.steps.map((s: { text: string }) => s.text).join("\n"),
          is_public: recipe.is_public,
        }}
      />
    </main>
  );
}
