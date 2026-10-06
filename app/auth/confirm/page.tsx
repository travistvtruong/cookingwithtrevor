import type { Metadata } from "next";
import Link from "next/link";
import { safeNext } from "@/lib/safe-next";
import { ConfirmForm } from "./confirm-form";

export const metadata: Metadata = { title: "Confirm", robots: { index: false } };

// Where email links land (sign-up confirmation, password reset). Opening the
// page does nothing; the person presses a button to use the link. Corporate
// and university email scanners (e.g. Microsoft Safe Links) open every link
// in a message, which used to spend the one-time token before the person
// clicked it. They don't press buttons.
export default async function ConfirmPage({ searchParams }: PageProps<"/auth/confirm">) {
  const params = await searchParams;
  const tokenHash = typeof params.token_hash === "string" ? params.token_hash : "";
  const type = typeof params.type === "string" ? params.type : "";
  const isReset = type === "recovery";
  const next = safeNext(params.next ?? (isReset ? "/reset-password" : "/"));

  if (!tokenHash || !type) {
    return (
      <main className="mx-auto w-full max-w-sm flex-1 px-4 py-12">
        <h1 className="text-2xl font-extrabold text-ink">This link doesn&apos;t look right</h1>
        <p className="mt-2 text-stone-600">
          It may have been cut off. Open the link from the email again, or request a new one.
        </p>
        <Link href="/login" className="mt-4 inline-block py-1.5 font-semibold text-brand underline">
          Go to sign in
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-sm flex-1 px-4 py-12">
      <h1 className="text-2xl font-extrabold text-ink">{isReset ? "Reset your password" : "Confirm your email"}</h1>
      <p className="mb-6 mt-2 text-stone-600">
        {isReset
          ? "Continue to choose a new password for your account."
          : "One last step: confirm your email to finish creating your account."}
      </p>
      <ConfirmForm tokenHash={tokenHash} type={type} next={next} isReset={isReset} />
    </main>
  );
}
