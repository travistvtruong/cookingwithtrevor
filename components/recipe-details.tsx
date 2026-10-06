import type { Ingredient } from "@/lib/ingredients";
import { formatMinutes, totalMinutes } from "@/lib/recipes";
import { RecipeBody } from "./recipe-body";

type Props = {
  title: string;
  prep_min: number | null;
  cook_min: number | null;
  servings: number | null;
  ingredients: (Ingredient & { position: number })[];
  steps: { position: number; text: string }[];
  anchorId?: string; // target for the "Jump to recipe" link
  // h1 when the recipe is the page itself (library); h2 under a post's own h1.
  titleAs?: "h1" | "h2";
};

// The recipe card: times, then (in RecipeBody) the scaler, cook mode and print
// buttons, ingredients and numbered steps.
export function RecipeDetails({
  anchorId,
  titleAs: Title = "h2",
  title,
  prep_min,
  cook_min,
  servings,
  ingredients,
  steps,
}: Props) {
  const total = totalMinutes({ prep_min, cook_min });
  const facts = [
    prep_min != null && ["Prep", formatMinutes(prep_min)],
    cook_min != null && ["Cook", formatMinutes(cook_min)],
    total && ["Total", formatMinutes(total)],
  ].filter(Boolean) as [string, string][];

  return (
    <section
      id={anchorId}
      className="scroll-mt-4 rounded-lg border border-stone-200 bg-white p-5 sm:p-8 print:border-0 print:p-0"
    >
      <Title className="text-2xl font-semibold text-stone-900">{title}</Title>

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

      <RecipeBody title={title} servings={servings} ingredients={ingredients} steps={steps} />
    </section>
  );
}
