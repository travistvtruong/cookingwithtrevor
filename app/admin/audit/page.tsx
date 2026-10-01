import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";

export const metadata: Metadata = { title: "Audit log", robots: { index: false } };

type Entry = {
  id: number;
  at: string;
  actor_name: string | null;
  action: string;
  entity_type: string;
  summary: string;
};

const SHOWN = 200;

// Read-only view of the append-only audit log (admins with 2FA only, per RLS).
export default async function AuditLogPage() {
  const { supabase } = await requireAdmin("/admin/audit");
  const { data, error } = await supabase
    .from("audit_log")
    .select("id, at, actor_name, action, entity_type, summary")
    .order("at", { ascending: false })
    .limit(SHOWN);
  const missing = error?.code === "PGRST205" || error?.code === "42P01";
  if (error && !missing) throw error;
  const entries = (data ?? []) as Entry[];

  return (
    <main>
      <h1 className="text-2xl font-extrabold text-ink">Audit log</h1>
      <p className="mt-1 text-sm text-stone-600">
        Every publish, edit, delete and moderation decision, newest first. Entries can&apos;t be edited or deleted.
      </p>

      {missing ? (
        <p className="mt-6 text-stone-600">The audit log isn&apos;t set up yet: run the audit log migration.</p>
      ) : entries.length === 0 ? (
        <p className="mt-6 text-stone-600">Nothing logged yet.</p>
      ) : (
        <ol className="mt-6 divide-y divide-stone-200 rounded-lg border border-stone-200 bg-white">
          {entries.map((e) => (
            <li key={e.id} className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-baseline sm:gap-4">
              <time dateTime={e.at} className="shrink-0 text-xs text-stone-500 sm:w-40">
                {new Date(e.at).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}
              </time>
              <span className="shrink-0 rounded-full bg-stone-100 px-2 py-0.5 font-mono text-xs text-stone-700">
                {e.action}
              </span>
              <span className="min-w-0 break-words text-sm text-stone-900">{e.summary}</span>
              <span className="text-xs text-stone-500 sm:ml-auto">{e.actor_name ?? "unknown"}</span>
            </li>
          ))}
        </ol>
      )}
      {entries.length === SHOWN && <p className="mt-3 text-xs text-stone-500">Showing the latest {SHOWN} entries.</p>}
    </main>
  );
}
