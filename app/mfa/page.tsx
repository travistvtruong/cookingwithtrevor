import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { safeNext } from "@/lib/safe-next";
import { MfaForm } from "./mfa-form";

export const metadata: Metadata = { title: "Two-factor authentication", robots: { index: false } };

// Where admins land when their session hasn't passed 2FA yet (see requireAdmin).
export default async function MfaPage({ searchParams }: PageProps<"/mfa">) {
  const { next } = await searchParams;
  await requireUser("/mfa");

  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 py-12">
      <h1 className="text-2xl font-extrabold text-ink">Two-factor authentication</h1>
      <p className="mb-6 mt-2 text-stone-600">
        The dashboard needs a code from an authenticator app (like Google Authenticator, 1Password or Authy) as well
        as your password.
      </p>
      <MfaForm next={safeNext(next ?? "/admin")} />
    </main>
  );
}
