"use client";

import { useActionState } from "react";
import { RecipeForm } from "@/components/recipe-form";
import type { RecipeFormState, RecipeFormValues } from "@/lib/recipe-form";
import { importRecipe, type ImportState } from "../import-actions";

type Props = {
  initial: RecipeFormValues;
  saveAction: (state: RecipeFormState, formData: FormData) => Promise<RecipeFormState>;
};

// "Import from a link" above the normal recipe form: a successful import
// fills the form in, and the user edits and saves it as usual (R7).
export function ImportableRecipeForm({ initial, saveAction }: Props) {
  const [state, importAction, pending] = useActionState<ImportState, FormData>(importRecipe, {});

  return (
    <>
      <form action={importAction} className="mb-8 rounded-lg border border-stone-200 bg-white p-4 sm:p-5">
        <label htmlFor="import-url" className="block text-sm font-semibold text-stone-800">
          Import from a link
        </label>
        <p className="mt-1 text-sm text-stone-600">
          Paste a recipe page and we&apos;ll fill in the form below for you to check. The original is linked from
          your copy.
        </p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input
            id="import-url"
            name="url"
            type="url"
            inputMode="url"
            required
            placeholder="https://"
            aria-describedby={state.error ? "import-error" : undefined}
            className="min-w-0 flex-1 rounded-md border border-stone-300 bg-white px-3 py-2 text-base text-stone-900 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
          />
          <button
            type="submit"
            disabled={pending}
            className="rounded-full bg-ink px-5 py-2 font-semibold text-white hover:bg-stone-700 disabled:opacity-60"
          >
            {pending ? "Importing…" : "Import"}
          </button>
        </div>
        {state.error && (
          <p id="import-error" role="alert" className="mt-2 text-sm text-red-700">
            {state.error}
          </p>
        )}
        {state.values && (
          <p role="status" className="mt-2 text-sm text-green-700">
            Imported. Check the details below, then save.
          </p>
        )}
      </form>

      <RecipeForm
        // A new import replaces whatever was typed before.
        key={state.importedAt ?? "blank"}
        variant="private"
        action={saveAction}
        initial={state.values ?? initial}
        sourceUrl={state.sourceUrl}
      />
    </>
  );
}
