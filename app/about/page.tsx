import type { Metadata } from "next";
import Link from "next/link";
import { InstagramLink } from "@/components/instagram-link";

export const metadata: Metadata = {
  title: "About",
  description: "Who's behind cookingwithtrevor, and what you'll find here.",
  alternates: { canonical: "/about" },
};

// A first draft: replace with your own words.
export default function AboutPage() {
  return (
    <main className="mx-auto w-full max-w-prose flex-1 px-4 py-10 sm:py-14">
      <h1 className="text-4xl font-extrabold tracking-tight text-ink sm:text-6xl">About</h1>
      <div className="mt-8 space-y-5 text-lg leading-relaxed text-stone-700">
        <p>
          Hi, I&apos;m Trevor. cookingwithtrevor is where the food I cook and eat ends up: the full recipes behind
          what I post on Instagram, and honest (okay, biased) reviews of the places I&apos;ve been.
        </p>
        <p>
          Every <Link href="/recipes" className="font-semibold text-brand hover:underline">recipe</Link> has its
          ingredients and steps laid out so you can cook along, and you can save any of them to your own library and
          turn them into a grocery list. The{" "}
          <Link href="/reviews" className="font-semibold text-brand hover:underline">reviews</Link> are what I
          thought of a place and what I ordered.
        </p>
        <p>
          Made something from here, or think I got a review wrong? Leave a rating and a comment on the post.
        </p>
      </div>
      <InstagramLink
        showHandle
        className="mt-8 rounded-full border border-stone-300 bg-white px-5 py-2 font-semibold text-ink hover:border-brand hover:text-brand"
      />
    </main>
  );
}
