import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { DeleteAccountForm, NameForm } from "./account-forms";

export const metadata: Metadata = { title: "Account", robots: { index: false } };

export default async function AccountPage() {
  const { supabase, userId } = await requireUser("/account");
  const [{ data: auth }, { data: profile }] = await Promise.all([
    supabase.auth.getClaims(),
    supabase.from("profiles").select("name, role").eq("id", userId).maybeSingle(),
  ]);
  const isAdmin = profile?.role === "admin";

  return (
    <main className="mx-auto w-full max-w-xl flex-1 px-4 py-10 sm:py-14">
      <h1 className="text-4xl font-extrabold tracking-tight text-ink">Account</h1>
      <p className="mt-2 text-stone-600">Signed in as {auth?.claims.email}</p>

      <section className="mt-10 space-y-4 border-t border-stone-200 pt-8">
        <h2 className="text-xl font-bold text-ink">Your name</h2>
        <NameForm name={profile?.name ?? ""} />
      </section>

      <section className="mt-10 space-y-3 border-t border-stone-200 pt-8">
        <h2 className="text-xl font-bold text-ink">Password</h2>
        <Link
          href="/reset-password"
          className="inline-block rounded-full border border-stone-300 bg-white px-5 py-2 font-semibold text-stone-800 hover:bg-stone-50"
        >
          Change password
        </Link>
      </section>

      <section className="mt-10 space-y-3 border-t border-stone-200 pt-8">
        <h2 className="text-xl font-bold text-ink">Delete account</h2>
        {isAdmin ? (
          <p className="text-stone-600">
            This is the admin account, which owns the published posts, so it can&apos;t be deleted from the site.
          </p>
        ) : (
          <>
            <p className="text-stone-600">
              This permanently deletes your account, your library, ratings, comments, grocery lists, collections
              and photos. It can&apos;t be undone.
            </p>
            <DeleteAccountForm />
          </>
        )}
      </section>
    </main>
  );
}
