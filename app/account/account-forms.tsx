"use client";

import { useActionState } from "react";
import { DELETE_CONFIRMATION } from "@/lib/account";
import { deleteAccount, updateName, type AccountState } from "./actions";

const inputClass =
  "w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-base text-stone-900 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30";

function Feedback({ state }: { state: AccountState }) {
  if (state.error) return <p role="alert" className="text-sm text-red-700">{state.error}</p>;
  if (state.message) return <p role="status" className="text-sm text-green-700">{state.message}</p>;
  return null;
}

export function NameForm({ name }: { name: string }) {
  const [state, formAction, pending] = useActionState<AccountState, FormData>(updateName, {});
  return (
    <form action={formAction} className="space-y-3">
      <label className="block space-y-1">
        <span className="text-sm font-medium text-stone-700">Display name</span>
        <input name="name" defaultValue={name} required maxLength={80} autoComplete="nickname" className={inputClass} />
      </label>
      <p className="text-sm text-stone-500">Shown next to your ratings and comments.</p>
      <Feedback state={state} />
      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-brand px-5 py-2 font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
      >
        {pending ? "Saving…" : "Save name"}
      </button>
    </form>
  );
}

export function DeleteAccountForm() {
  const [state, formAction, pending] = useActionState<AccountState, FormData>(deleteAccount, {});
  return (
    <form action={formAction} className="space-y-3">
      <label className="block space-y-1">
        <span className="text-sm font-medium text-stone-700">
          Type <strong className="font-semibold">{DELETE_CONFIRMATION}</strong> to confirm
        </span>
        <input name="confirm" required autoComplete="off" className={inputClass} />
      </label>
      <Feedback state={state} />
      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-red-700 px-5 py-2 font-semibold text-white hover:bg-red-800 disabled:opacity-60"
      >
        {pending ? "Deleting…" : "Delete my account"}
      </button>
    </form>
  );
}
