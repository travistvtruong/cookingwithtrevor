"use client"; // Error boundaries must be Client Components

import Link from "next/link";
import { useEffect } from "react";

// Shown when a page fails to load (e.g. Supabase is unreachable or paused).
export default function Error({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 py-16 text-center">
      <h1 className="text-2xl font-semibold text-stone-900">Something went wrong</h1>
      <p className="mt-3 text-stone-600">
        This page couldn&apos;t load. Check your connection and try again.
      </p>
      {error.digest && <p className="mt-2 text-xs text-stone-500">Error reference: {error.digest}</p>}
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <button
          type="button"
          onClick={() => retry()}
          className="rounded-full bg-brand px-5 py-2.5 font-medium text-white hover:bg-brand-dark"
        >
          Try again
        </button>
        <Link
          href="/"
          className="rounded-full border border-stone-300 bg-white px-5 py-2.5 font-medium text-stone-800 hover:bg-stone-50"
        >
          Go home
        </Link>
      </div>
    </main>
  );
}
