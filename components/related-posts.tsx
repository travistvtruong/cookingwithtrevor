import { PostGrid } from "@/components/post-grid";
import { getPublishedRecipes, type RecipeSummary } from "@/lib/recipes";
import { relatedPosts } from "@/lib/related";

// "More like this" (R34) at the end of a recipe or review.
export async function RelatedPosts({ post }: { post: RecipeSummary }) {
  const candidates = await getPublishedRecipes({ kind: post.kind });
  const related = relatedPosts(post, candidates);
  if (related.length === 0) return null;

  return (
    <section aria-labelledby="related-heading" className="mt-16 border-t border-stone-200 pt-10 print:hidden">
      <h2 id="related-heading" className="mb-6 text-2xl font-extrabold text-ink">
        More {post.kind === "review" ? "reviews" : "recipes"} like this
      </h2>
      <PostGrid posts={related} empty="" />
    </section>
  );
}
