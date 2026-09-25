import { formatIngredient, type Ingredient } from "@/lib/ingredients";
import { formatMinutes, totalMinutes } from "@/lib/recipes";

type Props = {
  title: string;
  prep_min: number | null;
  cook_min: number | null;
  servings: number | null;
  ingredients: (Ingredient & { position: number })[];
  steps: { position: number; text: string }[];
  anchorId?: string; // target for the "Jump to recipe" link
};

// The recipe card: times, ingredients and numbered steps.
export function RecipeDetails({ anchorId, title, prep_min, cook_min, servings, ingredients, steps }: Props) {
  const total = totalMinutes({ prep_min, cook_min });
  const facts = [
    prep_min != null && ["Prep", formatMinutes(prep_min)],
    cook_min != null && ["Cook", formatMinutes(cook_min)],
    total && ["Total", formatMinutes(total)],
    servings && ["Serves", String(servings)],
  ].filter(Boolean) as [string, string][];

  return (
    <section
      id={anchorId}
      className="scroll-mt-4 rounded-lg border border-stone-200 bg-white p-5 sm:p-8"
    >
      <h2 className="text-2xl font-semibold text-stone-900">{title}</h2>

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
        {ingredients.map((ing) => (
          <li key={ing.position} className="flex gap-3 text-stone-800">
            <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-orange-600" />
            {formatIngredient(ing)}
          </li>
        ))}
      </ul>

      <h3 className="mt-8 text-lg font-semibold text-stone-900">Steps</h3>
      <ol className="mt-3 space-y-4">
        {steps.map((step, i) => (
          <li key={step.position} className="flex gap-4 text-stone-800">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-orange-100 text-sm font-semibold text-orange-800">
              {i + 1}
            </span>
            <p className="pt-0.5 leading-relaxed">{step.text}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
