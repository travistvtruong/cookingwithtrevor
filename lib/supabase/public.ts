import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Cookie-free client for public blog data. Reading no cookies lets post pages be
// prerendered and cached; row-level security limits it to public recipes.
export function createPublicClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
