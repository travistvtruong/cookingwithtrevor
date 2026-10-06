"use client";

import { useRef, useState } from "react";
import { formatIngredient, type Ingredient } from "@/lib/ingredients";
import { MAX_SERVINGS, MULTIPLIERS, clampServings, multiplierLabel, scaleIngredients } from "@/lib/scale";
import { CookMode } from "./cook-mode";

type Props = {
  title: string;
  servings: number | null;
  ingredients: (Ingredient & { position: number })[];
  steps: { position: number; text: string }[];
};

const toolButton =
  "rounded-full border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-stone-800 hover:border-brand hover:text-brand";

// The interactive part of the recipe card: serving-size scaler (R9), cook
// mode (R31), print (R12), then the (scaled) ingredients and the steps.
export function RecipeBody({ title, servings, ingredients, steps }: Props) {
  const [people, setPeople] = useState(servings ?? 0);
  const [multiplier, setMultiplier] = useState(1);
  const [cooking, setCooking] = useState(false);
  const cookButton = useRef<HTMLButtonElement>(null);

  function closeCookMode() {
    setCooking(false);
    cookButton.current?.focus(); // back where the cook left off
  }

  const factor = servings ? people / servings : multiplier;
  const scaled = scaleIngredients(ingredients, factor);

  return (
    <>
      <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3 print:hidden">
        {servings ? (
          <div className="flex items-center gap-2" role="group" aria-label="Servings">
            <span className="text-sm font-medium text-stone-700">Servings</span>
            <button
              type="button"
              onClick={() => setPeople((n) => clampServings(n - 1))}
              disabled={people <= 1}
              aria-label="Fewer servings"
              className="h-9 w-9 rounded-full border border-stone-300 bg-white text-lg font-semibold text-stone-800 hover:border-brand disabled:opacity-40"
            >
              −
            </button>
            <output aria-live="polite" className="w-8 text-center text-lg font-semibold text-ink">
              {people}
            </output>
            <button
              type="button"
              onClick={() => setPeople((n) => clampServings(n + 1))}
              disabled={people >= MAX_SERVINGS}
              aria-label="More servings"
              className="h-9 w-9 rounded-full border border-stone-300 bg-white text-lg font-semibold text-stone-800 hover:border-brand disabled:opacity-40"
            >
              +
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2" role="group" aria-label="Scale recipe">
            <span className="text-sm font-medium text-stone-700">Scale</span>
            {MULTIPLIERS.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMultiplier(m)}
                aria-pressed={multiplier === m}
                className={`rounded-full px-3 py-1.5 text-sm font-semibold ${
                  multiplier === m ? "bg-ink text-white" : "border border-stone-300 bg-white text-stone-800 hover:border-brand"
                }`}
              >
                {multiplierLabel(m)}
              </button>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          <button ref={cookButton} type="button" onClick={() => setCooking(true)} className={toolButton}>
            Cook mode
          </button>
          <button type="button" onClick={() => window.print()} className={toolButton}>
            Print
          </button>
        </div>
      </div>

      {servings && <p className="mt-4 hidden text-stone-800 print:block">Serves {people}</p>}

      <h3 className="mt-8 text-lg font-semibold text-stone-900">
        Ingredients
        {factor !== 1 && (
          <span className="ml-2 text-sm font-normal text-stone-500">
            {servings ? `for ${people}` : `${multiplierLabel(multiplier)} recipe`}
          </span>
        )}
      </h3>
      <ul className="mt-3 space-y-2">
        {scaled.map((ing) => (
          <li key={ing.position} className="flex gap-3 text-stone-800">
            <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
            {formatIngredient(ing)}
          </li>
        ))}
      </ul>

      <h3 className="mt-8 text-lg font-semibold text-stone-900">Steps</h3>
      <ol className="mt-3 space-y-4">
        {steps.map((step, i) => (
          <li key={step.position} className="flex gap-4 text-stone-800 print:break-inside-avoid">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-soft text-sm font-semibold text-brand-dark">
              {i + 1}
            </span>
            <p className="pt-0.5 leading-relaxed">{step.text}</p>
          </li>
        ))}
      </ol>

      {cooking && (
        <CookMode
          title={title}
          ingredients={scaled.map(formatIngredient)}
          steps={steps.map((s) => s.text)}
          onClose={closeCookMode}
        />
      )}
    </>
  );
}
