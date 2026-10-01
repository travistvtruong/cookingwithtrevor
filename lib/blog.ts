import "server-only";
import { cache } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createPublicClient } from "@/lib/supabase/public";

export type BlogPostSummary = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  cover_photo_url: string | null;
  tags: string[];
  published_at: string | null;
  updated_at: string;
};

export type BlogPost = BlogPostSummary & { body: string; is_public: boolean };

const SUMMARY_FIELDS = "id, title, slug, excerpt, cover_photo_url, tags, published_at, updated_at";

// Until the blog_posts migration has run, treat the missing table as "no posts"
// so builds and deploys don't fail (PGRST205: not in schema cache, 42P01: no relation).
export function missingTable(error: { code?: string } | null) {
  if (error && (error.code === "PGRST205" || error.code === "42P01")) {
    console.warn("blog_posts table not found: run supabase/migrations/20261002000000_blog_posts.sql");
    return true;
  }
  return false;
}

export const blogPath = (post: { slug: string }) => `/blog/${post.slug}`;

export async function getPublishedBlogPosts({ limit }: { limit?: number } = {}): Promise<BlogPostSummary[]> {
  let query = createPublicClient()
    .from("blog_posts")
    .select(SUMMARY_FIELDS)
    .eq("is_public", true)
    .order("published_at", { ascending: false });
  if (limit) query = query.limit(limit);
  const { data, error } = await query;
  if (missingTable(error)) return [];
  if (error) throw error;
  return data as BlogPostSummary[];
}

// Wrapped in React cache so generateMetadata and the page share one query.
export const getPublishedBlogPost = cache(async (slug: string): Promise<BlogPost | null> => {
  const { data, error } = await createPublicClient()
    .from("blog_posts")
    .select(`${SUMMARY_FIELDS}, body, is_public`)
    .eq("slug", slug)
    .eq("is_public", true)
    .maybeSingle();
  if (missingTable(error)) return null;
  if (error) throw error;
  return data as BlogPost | null;
});

// Any blog post (draft or published) for the admin to edit. RLS: admin only.
export async function getBlogPostForEdit(supabase: SupabaseClient, id: string): Promise<BlogPost | null> {
  const { data } = await supabase
    .from("blog_posts")
    .select(`${SUMMARY_FIELDS}, body, is_public`)
    .eq("id", id)
    .maybeSingle();
  return data as BlogPost | null;
}

export function formatDate(iso: string | null) {
  return iso ? new Date(iso).toLocaleDateString("en-US", { dateStyle: "long" }) : "";
}
