"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export type ReviewState = { error?: string; message?: string };

const reviewSchema = z.object({
  stars: z.coerce.number().int().min(1, "Pick a star rating.").max(5),
  comment: z.string().trim().max(2000, "Keep comments under 2,000 characters."),
});

// One review per user per recipe: posting again updates it.
export async function saveReview(
  recipeId: string,
  slug: string,
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
  const { data: updated, error: updateError } = await supabase
    .from("ratings_comments")
    .update({ stars, comment })
    .eq("recipe_id", recipeId)
    .eq("user_id", userId)
    .select("id");
  if (updateError) return { error: "Could not save your review. Please try again." };

  if (!updated.length) {
    const { error } = await supabase
      .from("ratings_comments")
      .insert({ recipe_id: recipeId, user_id: userId, stars, comment });
    if (error) {
      // Raised by the rate-limit trigger in the database.
      if (error.code === "P0001") return { error: error.message };
      return { error: "Could not save your review. Please try again." };
    }
  }

  revalidatePath(`/recipes/${slug}`);
  return { message: updated.length ? "Review updated." : "Thanks for your review!" };
}

// Users can delete their own review; the admin can delete any (enforced by RLS).
export async function deleteReview(reviewId: string, slug: string): Promise<ReviewState> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ratings_comments")
    .delete()
    .eq("id", reviewId)
    .select("id");
  if (error || !data.length) return { error: "Could not delete that review." };

  revalidatePath(`/recipes/${slug}`);
  return { message: "Review deleted." };
}
