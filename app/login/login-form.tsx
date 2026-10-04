"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { signIn, signUp, type AuthState } from "./actions";

const inputClass =
  "w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-base text-stone-900 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30";

export function LoginForm({ next, initialState }: { next: string; initialState: AuthState }) {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [state, formAction, pending] = useActionState<AuthState, FormData>(
    mode === "signin" ? signIn : signUp,
    initialState,
  );

  return (
    <div className="space-y-6">
      <form action={formAction} className="space-y-4">
        <input type="hidden" name="next" value={next} />
        {mode === "signup" && (
          <label className="block space-y-1">
            <span className="text-sm font-medium text-stone-700">Name</span>
            <input name="name" required autoComplete="name" className={inputClass} />
          </label>
        )}
        <label className="block space-y-1">
          <span className="text-sm font-medium text-stone-700">Email</span>
          <input name="email" type="email" required autoComplete="email" className={inputClass} />
        </label>
        <label className="block space-y-1">
          <span className="text-sm font-medium text-stone-700">Password</span>
          <input
            name="password"
            type="password"
            required
            minLength={mode === "signup" ? 8 : undefined}
            autoComplete={mode === "signin" ? "current-password" : "new-password"}
            className={inputClass}
          />
        </label>

        {state.error && (
          <p role="alert" className="text-sm text-red-700">{state.error}</p>
        )}
        {state.message && <p className="text-sm text-green-700">{state.message}</p>}

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-full bg-brand px-4 py-2.5 font-medium text-white hover:bg-brand-dark disabled:opacity-60"
        >
          {pending ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
        </button>
      </form>

      {mode === "signin" && (
        <p className="text-center text-sm">
          <Link href="/forgot-password" className="inline-block py-1.5 font-medium text-brand underline">
            Forgot your password?
          </Link>
        </p>
      )}

      <p className="text-center text-sm text-stone-600">
        {mode === "signin" ? "New here? " : "Already have an account? "}
        <button
          type="button"
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          className="font-medium text-brand underline"
        >
          {mode === "signin" ? "Create an account" : "Sign in"}
        </button>
      </p>
    </div>
  );
}
