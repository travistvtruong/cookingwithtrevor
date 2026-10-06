"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Captcha } from "@/components/captcha";
import { requestPasswordReset, updatePassword, type PasswordState } from "./actions";

const inputClass =
  "w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-base text-stone-900 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30";
const submitClass =
  "w-full rounded-full bg-brand px-4 py-2.5 font-semibold text-white hover:bg-brand-dark disabled:opacity-60";

function Feedback({ state }: { state: PasswordState }) {
  if (state.error) return <p role="alert" className="text-sm text-red-700">{state.error}</p>;
  if (state.message) return <p role="status" className="text-sm text-green-700">{state.message}</p>;
  return null;
}

export function ForgotPasswordForm() {
  const [state, formAction, pending] = useActionState<PasswordState, FormData>(requestPasswordReset, {});
  return (
    <form action={formAction} className="space-y-4">
      <label className="block space-y-1">
        <span className="text-sm font-medium text-stone-700">Email</span>
        <input name="email" type="email" required autoComplete="email" className={inputClass} />
      </label>
      <Captcha action="password-reset" resetKey={state} />
      <Feedback state={state} />
      <button type="submit" disabled={pending} className={submitClass}>
        {pending ? "Sending…" : "Email me a reset link"}
      </button>
    </form>
  );
}

export function ResetPasswordForm() {
  const [state, formAction, pending] = useActionState<PasswordState, FormData>(updatePassword, {});
  return (
    <form action={formAction} className="space-y-4">
      <label className="block space-y-1">
        <span className="text-sm font-medium text-stone-700">New password</span>
        <input name="password" type="password" required minLength={8} autoComplete="new-password" className={inputClass} />
      </label>
      <label className="block space-y-1">
        <span className="text-sm font-medium text-stone-700">Confirm new password</span>
        <input name="confirm" type="password" required minLength={8} autoComplete="new-password" className={inputClass} />
      </label>
      <Feedback state={state} />
      {state.needsMfa && (
        <Link
          href="/mfa?next=%2Freset-password"
          className="block w-full rounded-full border border-stone-300 bg-white px-4 py-2.5 text-center font-semibold text-stone-800 hover:bg-stone-50"
        >
          Enter your 2FA code
        </Link>
      )}
      <button type="submit" disabled={pending} className={submitClass}>
        {pending ? "Saving…" : "Set new password"}
      </button>
    </form>
  );
}
