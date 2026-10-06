import type { Metadata } from "next";
import Link from "next/link";
import { analyticsEnabled } from "@/lib/analytics";
import { siteConfig } from "@/lib/site-config";
import { turnstileSiteKey } from "@/lib/turnstile";

export const metadata: Metadata = {
  title: "Privacy policy",
  description: "What cookingwithtrevor collects, why, and how to delete it.",
  alternates: { canonical: "/privacy" },
};

const UPDATED = "October 5, 2026";

// Keep this in step with what the site actually stores (see the migrations).
export default function PrivacyPage() {
  const email = siteConfig.contactEmail;
  const captcha = Boolean(turnstileSiteKey());
  const analytics = analyticsEnabled();

  return (
    <main className="mx-auto w-full max-w-prose flex-1 px-4 py-10 sm:py-14">
      <h1 className="text-4xl font-extrabold tracking-tight text-ink">Privacy policy</h1>
      <p className="mt-2 text-sm text-stone-500">Last updated {UPDATED}</p>

      <div className="mt-8 space-y-8 leading-relaxed text-stone-700 [&_h2]:mb-2 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-ink [&_li]:ml-5 [&_li]:list-disc">
        <section>
          <h2>The short version</h2>
          <p>
            You can read everything here without an account. If you make one, the site keeps only what it needs to
            run your account and the things you save. There are no ads and no tracking cookies, and nothing is sold
            or shared for marketing.{" "}
            {analytics
              ? "Page visits are counted anonymously, without cookies (see below)."
              : "There are no analytics."}
          </p>
        </section>

        <section>
          <h2>What&apos;s stored when you make an account</h2>
          <ul className="space-y-1">
            <li>Your email address and password (the password is stored hashed, never in plain text).</li>
            <li>The display name you choose. It&apos;s shown publicly next to your ratings and comments.</li>
            <li>Ratings and comments you post. These are public on the post they belong to.</li>
            <li>
              Your library: recipes you save or write, your notes, collections and grocery lists. These are private to
              you.
            </li>
            <li>
              Photos you add to your own recipes. They&apos;re kept in private storage, and location data is removed
              from them before they&apos;re uploaded.
            </li>
          </ul>
        </section>

        <section>
          <h2>Cookies</h2>
          <p>
            The site sets cookies only to keep you signed in. Visitors who don&apos;t sign in get none. Fonts are
            served from this site, so your browser doesn&apos;t contact Google Fonts.
          </p>
        </section>

        <section>
          <h2>Who handles the data</h2>
          <ul className="space-y-1">
            <li>Supabase stores accounts, posts, comments and photos.</li>
            <li>Vercel hosts the website and keeps standard server logs (such as IP addresses) for a short time.</li>
            <li>Google (Gmail) sends account emails such as sign-up confirmations and password resets.</li>
            {analytics && (
              <li>
                Vercel Web Analytics counts visits to public pages without cookies or anything that identifies you.
                Your own pages (library, lists, account) are never counted.
              </li>
            )}
            {captcha && (
              <li>
                Cloudflare Turnstile checks that you&apos;re a person when you sign up, sign in or comment. It runs
                only on those forms.
              </li>
            )}
          </ul>
        </section>

        <section>
          <h2>Deleting your data</h2>
          <p>
            You can change your name, or delete your account and everything in it, from your{" "}
            <Link href="/account" className="font-semibold text-brand hover:underline">account page</Link>. Deleting
            removes your library, ratings, comments, grocery lists, collections and photos right away.
          </p>
        </section>

        <section>
          <h2>Questions</h2>
          <p>
            {email ? (
              <>
                Email{" "}
                <a href={`mailto:${email}`} className="font-semibold text-brand hover:underline">{email}</a> with any
                question about your data.
              </>
            ) : (
              <>Questions about your data? Leave a comment on any post and I&apos;ll get back to you.</>
            )}
          </p>
        </section>
      </div>
    </main>
  );
}
