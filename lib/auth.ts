import "server-only";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Returns the signed-in admin's id and a Supabase client, or 404s for everyone else.
// Row-level security enforces the same rule in the database; this keeps the UI hidden.
export async function requireAdmin() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims.sub;
  if (!userId) notFound();

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single();
  if (profile?.role !== "admin") notFound();

  return { supabase, userId };
}
