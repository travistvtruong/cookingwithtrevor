import Link from "next/link";
import { requireAdmin } from "@/lib/auth";

export default async function AdminDashboard() {
  const { supabase, userId } = await requireAdmin();
  const { data: recipes, error } = await supabase
    .from("recipes")
    .select("id, title, slug, is_public, updated_at")
    .eq("author_id", userId)
    .order("updated_at", { ascending: false });
  if (error) throw error;

  return (
    <main>
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold text-stone-900">Posts</h1>
        <Link
          href="/admin/new"
          className="rounded-md bg-orange-700 px-4 py-2 text-sm font-medium text-white hover:bg-orange-800"
        >
          New post
        </Link>
      </div>

      {recipes.length === 0 ? (
        <p className="mt-6 text-stone-600">No posts yet. Write your first one.</p>
      ) : (
        <ul className="mt-6 divide-y divide-stone-200 rounded-lg border border-stone-200 bg-white">
          {recipes.map((r) => (
            <li key={r.id} className="flex items-center justify-between gap-4 px-4 py-3">
              <div className="min-w-0">
                <Link
                  href={`/admin/${r.id}/edit`}
                  className="block truncate font-medium text-stone-900 hover:text-orange-700"
                >
                  {r.title}
                </Link>
                <p className="text-xs text-stone-500">
                  Updated {new Date(r.updated_at).toLocaleDateString("en-US", { dateStyle: "medium" })}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-3 text-sm">
                <span
                  className={
                    r.is_public
                      ? "rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800"
                      : "rounded-full bg-stone-100 px-2 py-0.5 text-xs font-medium text-stone-700"
                  }
                >
                  {r.is_public ? "Published" : "Draft"}
                </span>
                {r.is_public && (
                  <Link href={`/recipes/${r.slug}`} className="text-orange-700 hover:underline">
                    View
                  </Link>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
