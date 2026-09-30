"use client";

import Link from "next/link";
import { useActionState, useEffect, useState, useTransition } from "react";
import { Stars } from "@/components/stars";
import type { Review } from "@/lib/recipes";
import { createClient } from "@/lib/supabase/client";
import { deleteReview, saveReview, type ReviewState } from "./actions";

type Viewer = { userId: string | null; isAdmin: boolean } | undefined;

type Props = {
  recipeId: string;
  slug: string;
  reviews: Review[];
  rating: { average: number; count: number } | null;
};

// Review text is rendered server-side into the static page (good for SEO);
// who is viewing is worked out in the browser so the page can stay cached.
export function Reviews({ recipeId, slug, reviews, rating }: Props) {
  const [viewer, setViewer] = useState<Viewer>(undefined);
  const [deleteState, setDeleteState] = useState<ReviewState>({});
  const [deleting, startDelete] = useTransition();

  useEffect(() => {
    const supabase = createClient();
    (async () => {
      const { data } = await supabase.auth.getSession();
      const userId = data.session?.user.id ?? null;
      if (!userId) return setViewer({ userId: null, isAdmin: false });
      const { data: profile } = await supabase.from("profiles").select("role").eq("id", userId).single();
      setViewer({ userId, isAdmin: profile?.role === "admin" });
    })();
  }, []);

  const mine = viewer?.userId ? reviews.find((r) => r.user_id === viewer.userId) : undefined;

  function handleDelete(id: string, isOwn: boolean) {
    const question = isOwn ? "Delete your review?" : "Delete this review? This can't be undone.";
    if (!confirm(question)) return;
    startDelete(async () => setDeleteState(await deleteReview(id, slug)));
  }

  return (
    <section id="reviews" aria-labelledby="reviews-heading" className="mt-12 scroll-mt-4">
      <h2 id="reviews-heading" className="text-2xl font-semibold text-stone-900">
        Ratings &amp; comments
      </h2>
      {rating ? (
        <p className="mt-1 flex items-center gap-2 text-stone-700">
          <Stars value={rating.average} /> {rating.average} out of 5 · {rating.count}{" "}
          {rating.count === 1 ? "rating" : "ratings"}
        </p>
      ) : (
        <p className="mt-1 text-stone-600">No ratings yet. Be the first!</p>
      )}

      <div className="mt-6">
        {viewer === undefined ? null : viewer.userId ? (
          <ReviewForm
            recipeId={recipeId}
            slug={slug}
            existing={mine}
          />
        ) : (
          <p className="rounded-lg border border-stone-200 bg-white p-4 text-stone-700">
            <Link href={`/login?next=/recipes/${slug}`} className="font-medium text-orange-700 underline">
              Sign in
            </Link>{" "}
            to rate this recipe and leave a comment.
          </p>
        )}
      </div>

      {deleteState.error && <p role="alert" className="mt-4 text-sm text-red-700">{deleteState.error}</p>}

      {reviews.length > 0 && (
        <ul className="mt-8 space-y-4">
          {reviews.map((r) => {
            const isOwn = r.user_id === viewer?.userId;
            return (
              <li key={r.id} className="rounded-lg border border-stone-200 bg-white p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="font-medium text-stone-900">{isOwn ? "You" : r.author}</span>
                    <Stars value={r.stars} className="text-sm" />
                    <time dateTime={r.created_at} className="text-sm text-stone-500">
                      {new Date(r.created_at).toLocaleDateString("en-US", { dateStyle: "medium" })}
                    </time>
                  </div>
                  {(isOwn || viewer?.isAdmin) && (
                    <button
                      type="button"
                      onClick={() => handleDelete(r.id, isOwn)}
                      disabled={deleting}
                      className="text-sm text-red-700 hover:underline disabled:opacity-60"
                    >
                      Delete
                    </button>
                  )}
                </div>
                {r.comment && (
                  <p className="mt-2 whitespace-pre-line leading-relaxed text-stone-800">{r.comment}</p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function ReviewForm({ recipeId, slug, existing }: { recipeId: string; slug: string; existing?: Review }) {
  const [state, formAction, pending] = useActionState(saveReview.bind(null, recipeId, slug), {});
  // Controlled fields so React's post-submit form reset doesn't clear what was just saved.
  const [stars, setStars] = useState(existing?.stars ?? 0);
  const [comment, setComment] = useState(existing?.comment ?? "");
  const [hover, setHover] = useState(0);
  const shown = hover || stars;

  return (
    <form action={formAction} className="space-y-4 rounded-lg border border-stone-200 bg-white p-4 sm:p-5">
      <fieldset>
        <legend className="text-sm font-medium text-stone-700">
          {existing ? "Your rating" : "Rate this recipe"}
        </legend>
        <div className="mt-1 flex" onMouseLeave={() => setHover(0)}>
          {[1, 2, 3, 4, 5].map((n) => (
            <label
              key={n}
              onMouseEnter={() => setHover(n)}
              className="cursor-pointer p-1 text-3xl leading-none has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-orange-600"
            >
              <input
                type="radio"
                name="stars"
                value={n}
                checked={stars === n}
                onChange={() => setStars(n)}
                className="sr-only"
              />
              <span aria-hidden className={n <= shown ? "text-orange-600" : "text-stone-300"}>★</span>
              <span className="sr-only">{n} {n === 1 ? "star" : "stars"}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="space-y-1">
        <label htmlFor="comment" className="text-sm font-medium text-stone-700">
          Comment <span className="font-normal text-stone-500">(optional)</span>
        </label>
        <textarea
          id="comment"
          name="comment"
          rows={3}
          maxLength={2000}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="How did it turn out? Any changes you made?"
          className="w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-base text-stone-900 focus:border-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-600/30"
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={pending || stars === 0}
          className="rounded-md bg-orange-700 px-5 py-2.5 font-medium text-white hover:bg-orange-800 disabled:opacity-60"
        >
          {pending ? "Saving…" : existing ? "Update review" : "Post review"}
        </button>
        <p aria-live="polite" className={state.error ? "text-sm text-red-700" : "text-sm text-green-700"}>
          {state.error ?? state.message}
        </p>
      </div>
    </form>
  );
}
