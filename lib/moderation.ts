import type { SupabaseClient } from "@supabase/supabase-js";

// How many comments are held for review. Only the admin (with 2FA) can see
// other people's pending comments, so this is 0 for everyone else.
export async function countPendingComments(supabase: SupabaseClient): Promise<number> {
  const { count, error } = await supabase
    .from("ratings_comments")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending");
  if (error) return 0;
  return count ?? 0;
}

export function pendingLabel(count: number): string {
  return count === 1 ? "1 comment waiting for review" : `${count} comments waiting for review`;
}
