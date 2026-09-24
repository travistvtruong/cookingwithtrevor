import type { Metadata } from "next";
import { safeNext } from "@/lib/safe-next";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Sign in",
  robots: { index: false },
};

const ERRORS: Record<string, string> = {
  google: "Google sign-in could not start. Please try again.",
  callback: "Sign-in didn't complete. Please try again.",
  expired:
    "That link has expired or was already used. If you already confirmed your email, just sign in below.",
};

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const params = await searchParams;
  const next = safeNext(params.next);
  const errorKey = typeof params.error === "string" ? params.error : undefined;
  const initialState = {
    error: errorKey ? ERRORS[errorKey] : undefined,
    message: params.confirmed ? "Your email is confirmed. Please sign in to continue." : undefined,
  };

  return (
    <main className="mx-auto w-full max-w-sm flex-1 px-4 py-12">
      <h1 className="mb-8 text-center text-2xl font-semibold text-stone-900">
        Sign in to cookingwithtrevor
      </h1>
      <LoginForm next={next} initialState={initialState} />
    </main>
  );
}
