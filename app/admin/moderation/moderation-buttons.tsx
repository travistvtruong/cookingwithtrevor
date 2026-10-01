"use client";

import { useState, useTransition } from "react";
import { moderateComment } from "./actions";

export function ModerationButtons({ commentId }: { commentId: string }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const decide = (decision: "approved" | "rejected") =>
    startTransition(async () => {
      setError(null);
      const result = await moderateComment(commentId, decision);
      if (result.error) setError(result.error);
    });

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={() => decide("approved")}
        disabled={pending}
        className="rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
      >
        Approve
      </button>
      <button
        type="button"
        onClick={() => decide("rejected")}
        disabled={pending}
        className="rounded-full border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-stone-800 hover:bg-stone-50 disabled:opacity-60"
      >
        Reject
      </button>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    </div>
  );
}
