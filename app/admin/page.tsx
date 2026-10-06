import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { blogPath, missingTable } from "@/lib/blog";
import { countPendingComments, pendingLabel } from "@/lib/moderation";
import { postPath } from "@/lib/recipes";

export default async function AdminDashboard() {
  const { supabase, userId } = await requireAdmin();
  const { data: recipes, error } = await supabase
    .from("recipes")
    .select("id, kind, title, slug, is_public, updated_at")
    .eq("author_id", userId)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  const { data: blogPosts, error: blogError } = await supabase
    .from("blog_posts")
    .select("id, title, slug, is_public, updated_at")
    .order("updated_at", { ascending: false });
  if (blogError && !missingTable(blogError)) throw blogError;
  const pending = await countPendingComments(supabase);

  return (
    <main>
      {pending > 0 && (
        <Link
          href="/admin/moderation"
          className="mb-6 flex items-center justify-between gap-4 rounded-lg border border-brand-soft bg-brand-tint px-4 py-3 text-sm font-medium text-brand-dark hover:border-brand"
        >
          <span>{pendingLabel(pending)}.</span>
          <span className="font-semibold">Review now →</span>
        </Link>
      )}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-extrabold text-ink">Recipes &amp; reviews</h1>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/new"
            className="rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark"
          >
            New recipe
          </Link>
          <Link
            href="/admin/new?kind=review"
            className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white hover:bg-stone-700"
          >
            New review
          </Link>
          <Link
            href="/admin/blog/new"
            className="rounded-full border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-stone-800 hover:bg-stone-50"
          >
            New blog post
          </Link>
        </div>
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
                  className="block truncate font-medium text-stone-900 hover:text-brand"
                >
                  {r.title}
                </Link>
                <p className="text-xs text-stone-500">
                  {r.kind === "review" ? "Review" : "Recipe"} · Updated {new Date(r.updated_at).toLocaleDateString("en-US", { dateStyle: "medium" })}
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
                  <Link href={postPath(r)} className="inline-block py-1.5 text-brand hover:underline">
                    View
                  </Link>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <h2 className="mt-12 text-xl font-extrabold text-ink">Blog posts</h2>
      {!blogPosts?.length ? (
        <p className="mt-4 text-stone-600">No blog posts yet.</p>
      ) : (
        <ul className="mt-4 divide-y divide-stone-200 rounded-lg border border-stone-200 bg-white">
          {blogPosts.map((p: { id: string; title: string; slug: string; is_public: boolean; updated_at: string }) => (
            <li key={p.id} className="flex items-center justify-between gap-4 px-4 py-3">
              <div className="min-w-0">
                <Link
                  href={`/admin/blog/${p.id}/edit`}
                  className="block truncate font-medium text-stone-900 hover:text-brand"
                >
                  {p.title}
                </Link>
                <p className="text-xs text-stone-500">
                  Blog · Updated {new Date(p.updated_at).toLocaleDateString("en-US", { dateStyle: "medium" })}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-3 text-sm">
                <span
                  className={
                    p.is_public
                      ? "rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800"
                      : "rounded-full bg-stone-100 px-2 py-0.5 text-xs font-medium text-stone-700"
                  }
                >
                  {p.is_public ? "Published" : "Draft"}
                </span>
                {p.is_public && (
                  <Link href={blogPath(p)} className="inline-block py-1.5 text-brand hover:underline">
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
