"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { postPath } from "@/lib/recipes";

export type ModerationResult = { error?: string };

// Approve or reject a held comment. The database function checks the admin
// (with 2FA), changes the status and writes the audit log in one transaction.
export async function moderateComment(id: string, decision: "approved" | "rejected"): Promise<ModerationResult> {
  if (decision !== "approved" && decision !== "rejected") return { error: "Unknown decision." };
  const { supabase } = await requireAdmin("/admin/moderation");

  const { data, error } = await supabase.rpc("moderate_comment", { p_id: id, p_status: decision });
  if (error) {
    if (error.code === "P0002") return { error: "That comment no longer exists." };
    return { error: `Couldn't update the comment: ${error.message}` };
  }

  // Approving shows it on the post (and changes the average); refresh that page.
  const post = (data as { recipe_kind: "recipe" | "review"; recipe_slug: string }[] | null)?.[0];
  if (post) revalidatePath(postPath({ kind: post.recipe_kind, slug: post.recipe_slug }));
  revalidatePath("/admin/moderation");
  return {};
}
