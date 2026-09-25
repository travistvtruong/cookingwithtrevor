"use client";

import { useActionState } from "react";
import { updateNotes, type NotesState } from "../actions";

export function NotesForm({ recipeId, notes }: { recipeId: string; notes: string }) {
  const [state, formAction, pending] = useActionState<NotesState, FormData>(
    updateNotes.bind(null, recipeId),
    {},
  );

  return (
    <form action={formAction} className="space-y-2">
      <label htmlFor="notes" className="text-lg font-semibold text-stone-900">
        My notes
      </label>
      <p className="text-sm text-stone-500">Only you can see these.</p>
      <textarea
        id="notes"
        name="notes"
        defaultValue={notes}
        rows={4}
        maxLength={5000}
        placeholder="Used half the sugar. Great with rice."
        className="w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-base text-stone-900 focus:border-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-600/30"
      />
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-800 hover:bg-stone-50 disabled:opacity-60"
        >
          {pending ? "Saving…" : "Save notes"}
        </button>
        <p aria-live="polite" className={state.error ? "text-sm text-red-700" : "text-sm text-green-700"}>
          {state.error ?? state.message}
        </p>
      </div>
    </form>
  );
}
