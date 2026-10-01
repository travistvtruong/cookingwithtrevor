"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { logAdminAction } from "@/lib/audit";
import { createClient } from "@/lib/supabase/server";

// pending: saved, but held for moderation (the database flags links and spam words).
export type ReviewState = { error?: string; message?: string; pending?: boolean };

// Refresh the cached post page. `path` comes from the browser, so only
// well-formed post paths are accepted.
function revalidatePost(path: string) {
  if (/^\/(recipes|reviews)\/[a-z0-9]+(-[a-z0-9]+)*$/.test(path)) revalidatePath(path);
}

const reviewSchema = z.object({
  stars: z.coerce.number().int().min(1, "Pick a star rating.").max(5),
  comment: z.string().trim().max(2000, "Keep comments under 2,000 characters."),
});

// One review per user per recipe: posting again updates it.
export async function saveReview(
  recipeId: string,
  path: string,
  _prev: ReviewState,
  formData: FormData,
): Promise<ReviewState> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  const userId = auth?.claims.sub;
  if (!userId) return { error: "Please sign in to leave a review." };

  const parsed = reviewSchema.safeParse({
    stars: formData.get("stars") ?? 0,
    comment: formData.get("comment") ?? "",
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { stars, comment } = parsed.data;

  // Update first so edits don't count toward the new-review rate limit.
  // select() returns the saved row, including the status the database chose
  // (selecting "*" keeps this working before the moderation migration runs).
  const { data: updated, error: updateError } = await supabase
    .from("ratings_comments")
    .update({ stars, comment })
    .eq("recipe_id", recipeId)
    .eq("user_id", userId)
    .select();
  if (updateError) return { error: "Could not save your review. Please try again." };

  let saved = ((updated ?? []) as { status?: string }[])[0];
  if (!saved) {
    // No status sent: the database decides (and users can't write that column).
    const { data: inserted, error } = await supabase
      .from("ratings_comments")
      .insert({ recipe_id: recipeId, user_id: userId, stars, comment })
      .select();
    if (error) {
      // Raised by the rate-limit trigger in the database.
      if (error.code === "P0001") return { error: error.message };
      return { error: "Could not save your review. Please try again." };
    }
    saved = ((inserted ?? []) as { status?: string }[])[0];
  }

  revalidatePost(path);
  if (saved?.status === "pending") {
    return { pending: true, message: "Thanks! Your comment will appear once it's been approved." };
  }
  if (saved?.status === "rejected") {
    return { error: "This comment was removed by a moderator, so it isn't shown." };
  }
  return { message: updated?.length ? "Review updated." : "Thanks for your review!" };
}

// Users can delete their own review; the admin can delete any (enforced by RLS).
export async function deleteReview(reviewId: string, path: string): Promise<ReviewState> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  const { data, error } = await supabase
    .from("ratings_comments")
    .delete()
    .eq("id", reviewId)
    .select("id, user_id, stars, comment");
  if (error || !data.length) return { error: "Could not delete that review." };

  // Deleting someone else's comment is moderation (only the admin can, per RLS): log it.
  const deleted = data[0] as { user_id: string; stars: number; comment: string };
  if (deleted.user_id !== auth?.claims.sub) {
    await logAdminAction(supabase, {
      action: "comment.deleted",
      entityType: "comment",
      entityId: reviewId,
      summary: `${deleted.stars}★ ${deleted.comment}`.slice(0, 300),
      details: { author_id: deleted.user_id, path },
    });
  }

  revalidatePost(path);
  return { message: "Review deleted." };
}
