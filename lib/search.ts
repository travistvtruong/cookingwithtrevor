import "server-only";
import { blogPath } from "@/lib/blog";
import { postPath } from "@/lib/recipes";
import { createPublicClient } from "@/lib/supabase/public";

export type SearchKind = "recipe" | "review" | "blog";

export type SearchResult = {
  kind: SearchKind;
  id: string;
  title: string;
  slug: string;
  summary: string;
  photo_url: string | null;
  place_name: string | null;
  my_rating: number | null;
  tags: string[];
  published_at: string | null;
  href: string;
};

export const MIN_QUERY = 2;
export const MAX_QUERY = 100;

// Normalize what the visitor typed: trim, collapse spaces, cap the length.
export function cleanQuery(raw: unknown): string {
  return typeof raw === "string" ? raw.replace(/\s+/g, " ").trim().slice(0, MAX_QUERY) : "";
}

// Search published recipes, reviews and blog posts (see search_posts in the
// migrations). Short queries return nothing without hitting the database.
export async function searchPosts(rawQuery: unknown, limit = 30): Promise<SearchResult[]> {
  const q = cleanQuery(rawQuery);
  if (q.length < MIN_QUERY) return [];

  const { data, error } = await createPublicClient().rpc("search_posts", { p_query: q, p_limit: limit });
  if (error) {
    // Until the search migration has run, show no results rather than an error page.
    if (error.code === "PGRST202" || error.code === "42883") {
      console.warn("search_posts not found: run supabase/migrations/20261003000000_search.sql");
      return [];
    }
    throw error;
  }

  return ((data ?? []) as Omit<SearchResult, "href">[]).map((r) => ({
    ...r,
    tags: r.tags ?? [],
    href: r.kind === "blog" ? blogPath(r) : postPath({ kind: r.kind, slug: r.slug }),
  }));
}
