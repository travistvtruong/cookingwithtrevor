import type { Metadata } from "next";
import Link from "next/link";
import { ForgotPasswordForm } from "../password/password-forms";

export const metadata: Metadata = { title: "Reset your password", robots: { index: false } };

export default function ForgotPasswordPage() {
  return (
    <main className="mx-auto w-full max-w-sm flex-1 px-4 py-12">
      <h1 className="text-2xl font-extrabold text-ink">Forgot your password?</h1>
      <p className="mb-6 mt-2 text-stone-600">Enter your email and we&apos;ll send you a link to set a new one.</p>
      <ForgotPasswordForm />
      <p className="mt-6 text-center text-sm text-stone-600">
        <Link href="/login" className="inline-block py-1.5 font-medium text-brand underline">
          Back to sign in
        </Link>
      </p>
    </main>
  );
}
