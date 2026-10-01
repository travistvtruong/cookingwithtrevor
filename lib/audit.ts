import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

export type AuditEntry = {
  action: string; // e.g. "recipe.published"
  entityType: "recipe" | "review" | "blog_post" | "comment";
  entityId: string;
  summary: string; // human-readable, e.g. the post title
  details?: Record<string, unknown>;
};

// Record an admin action in the append-only audit log (log_admin_action in the
// migrations; admins with 2FA only). Best effort: a logging failure is reported
// in the server logs but never undoes or blocks the action itself.
export async function logAdminAction(supabase: SupabaseClient, entry: AuditEntry) {
  try {
    const { error } = await supabase.rpc("log_admin_action", {
      p_action: entry.action,
      p_entity_type: entry.entityType,
      p_entity_id: entry.entityId,
      p_summary: String(entry.summary ?? "").slice(0, 300),
      p_details: entry.details ?? {},
    });
    if (error) console.warn(`Audit log write failed (${entry.action} ${entry.entityId}): ${error.message}`);
  } catch (e) {
    console.warn(`Audit log write failed (${entry.action} ${entry.entityId}):`, e);
  }
}
