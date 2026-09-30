import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Page not found" };

export default function NotFound() {
  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 py-16 text-center">
      <p className="text-sm font-medium text-orange-700">404</p>
      <h1 className="mt-2 text-2xl font-semibold text-stone-900">We couldn&apos;t find that page</h1>
      <p className="mt-3 text-stone-600">
        The recipe may have been moved or unpublished, or the link may be mistyped.
      </p>
      <Link
        href="/"
        className="mt-6 inline-block rounded-md bg-orange-700 px-5 py-2.5 font-medium text-white hover:bg-orange-800"
      >
        Browse recipes
      </Link>
    </main>
  );
}
