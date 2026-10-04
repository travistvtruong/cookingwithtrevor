import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { ResetPasswordForm } from "../password/password-forms";

export const metadata: Metadata = { title: "Set a new password", robots: { index: false } };

// Opened from the reset email: the link has already signed the user in.
export default async function ResetPasswordPage() {
  await requireUser("/reset-password");

  return (
    <main className="mx-auto w-full max-w-sm flex-1 px-4 py-12">
      <h1 className="text-2xl font-extrabold text-ink">Set a new password</h1>
      <p className="mb-6 mt-2 text-stone-600">Choose a password with at least 8 characters.</p>
      <ResetPasswordForm />
    </main>
  );
}
