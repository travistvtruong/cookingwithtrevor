"use client";

import Link from "next/link";
import { useActionState } from "react";
import { verifyEmailLink, type ConfirmState } from "./actions";

export function ConfirmForm({
  tokenHash,
  type,
  next,
  isReset,
}: {
  tokenHash: string;
  type: string;
  next: string;
  isReset: boolean;
}) {
  const [state, formAction, pending] = useActionState<ConfirmState, FormData>(verifyEmailLink, {});

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="token_hash" value={tokenHash} />
      <input type="hidden" name="type" value={type} />
      <input type="hidden" name="next" value={next} />

      {state.error && (
        <div role="alert" className="space-y-2 rounded-lg bg-stone-100 p-4 text-sm text-stone-800">
          <p>{state.error}</p>
          <Link
            href={isReset ? "/forgot-password" : "/login"}
            className="inline-block py-1.5 font-semibold text-brand underline"
          >
            {isReset ? "Request a new reset link" : "Go to sign in"}
          </Link>
        </div>
      )}

      <button
        type="submit"
        disabled={pending}
        autoFocus
        className="w-full rounded-full bg-brand px-5 py-3 font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
      >
        {pending ? "One moment…" : isReset ? "Continue to set a new password" : "Confirm my email"}
      </button>
    </form>
  );
}
