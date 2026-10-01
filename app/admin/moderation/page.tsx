import type { Metadata } from "next";
import Link from "next/link";
import { Stars } from "@/components/stars";
import { requireAdmin } from "@/lib/auth";
import { postPath } from "@/lib/recipes";
import { ModerationButtons } from "./moderation-buttons";

export const metadata: Metadata = { title: "Moderation", robots: { index: false } };

type Pending = {
  id: string;
  stars: number;
  comment: string;
  created_at: string;
  profiles: { name: string } | null;
  recipes: { title: string; slug: string; kind: "recipe" | "review" } | null;
};

// Comments the database held back (links, addresses or spam words), oldest first.
export default async function ModerationPage() {
  const { supabase } = await requireAdmin("/admin/moderation");
  const { data, error } = await supabase
    .from("ratings_comments")
    .select("id, stars, comment, created_at, profiles (name), recipes (title, slug, kind)")
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(100);
  // 42703: the status column doesn't exist until the moderation migration runs.
  const notSetUp = error?.code === "42703";
  if (error && !notSetUp) throw error;
  const pending = (data ?? []) as unknown as Pending[];

  return (
    <main>
      <h1 className="text-2xl font-extrabold text-ink">Moderation</h1>
      <p className="mt-1 text-sm text-stone-600">
        Comments with links, email addresses or spam words wait here. Approved ones appear on the post and count
        toward its rating.
      </p>

      {notSetUp ? (
        <p className="mt-6 text-stone-600">Moderation isn&apos;t set up yet: run the moderation migration.</p>
      ) : pending.length === 0 ? (
        <p className="mt-6 rounded-2xl border border-dashed border-stone-300 p-8 text-center text-stone-600">
          Nothing waiting. 🎉
        </p>
      ) : (
        <ul className="mt-6 space-y-4">
          {pending.map((c) => (
            <li key={c.id} className="space-y-3 rounded-2xl border border-stone-200 bg-white p-4">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                <span className="font-semibold text-ink">{c.profiles?.name || "A reader"}</span>
                <Stars value={c.stars} />
                <time dateTime={c.created_at} className="text-stone-500">
                  {new Date(c.created_at).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}
                </time>
                {c.recipes && (
                  <Link href={postPath(c.recipes)} className="text-brand hover:underline">
                    on {c.recipes.title}
                  </Link>
                )}
              </div>
              {/* Plain text: React escapes it, so links in spam can't become clickable. */}
              <p className="whitespace-pre-line break-words text-stone-800">{c.comment || "(no comment, rating only)"}</p>
              <ModerationButtons commentId={c.id} />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
