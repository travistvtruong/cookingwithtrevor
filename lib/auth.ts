import "server-only";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Returns the signed-in user's id and a Supabase client, or sends them to sign in.
export async function requireUser(next = "/library") {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims.sub;
  if (!userId) redirect(`/login?next=${encodeURIComponent(next)}`);
  return { supabase, userId };
}

// Returns the signed-in admin's id and a Supabase client; 404s for everyone else.
// Admins must also have passed two-factor authentication this session (AAL2);
// otherwise they're sent to /mfa to enroll or enter a code. The database's
// is_admin() requires AAL2 too, so this isn't only a UI check.
export async function requireAdmin(next = "/admin") {
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

  if (data?.claims.aal !== "aal2") redirect(`/mfa?next=${encodeURIComponent(next)}`);

  return { supabase, userId };
}
