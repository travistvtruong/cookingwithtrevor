import { RecipeCard } from "@/components/recipe-card";
import { blogPath, type BlogPostSummary } from "@/lib/blog";

// Blog posts as photo cards (same card as recipes and reviews, labelled "Blog").
export function BlogGrid({ posts, empty }: { posts: BlogPostSummary[]; empty: string }) {
  if (posts.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-stone-300 p-10 text-center text-stone-600">{empty}</p>
    );
  }
  return (
    <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {posts.map((post) => (
        <li key={post.id}>
          <RecipeCard
            href={blogPath(post)}
            badge="Blog"
            recipe={{
              title: post.title,
              slug: post.slug,
              photo_url: post.cover_photo_url,
              prep_min: null,
              cook_min: null,
              tags: post.tags,
            }}
          />
        </li>
      ))}
    </ul>
  );
}
