import Link from "next/link";
import { BlogGrid } from "@/components/blog-grid";
import { PostGrid } from "@/components/post-grid";
import { RecipeCard } from "@/components/recipe-card";
import { getPublishedBlogPosts } from "@/lib/blog";
import { getPublishedRecipes, type RecipeSummary } from "@/lib/recipes";

// Rebuilt on demand when a post is saved on this server; the 60s refresh also
// picks up changes made elsewhere (another deployment, local dev, the database).
export const revalidate = 60;

const LATEST = 3;

export default async function Home() {
  const [[featured], recipes, reviews, blogPosts] = await Promise.all([
    getPublishedRecipes({ limit: 1 }),
    getPublishedRecipes({ kind: "recipe", limit: LATEST + 1 }),
    getPublishedRecipes({ kind: "review", limit: LATEST + 1 }),
    getPublishedBlogPosts({ limit: LATEST }),
  ]);
  // Don't repeat the featured post right below it, unless it's the section's only post.
  const without = (posts: RecipeSummary[]) => {
    const rest = posts.filter((p) => p.id !== featured?.id);
    return (rest.length ? rest : posts).slice(0, LATEST);
  };

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:py-10">
      <h1 className="sr-only">cookingwithtrevor: recipes and food reviews</h1>

      <section className="grid gap-4 lg:grid-cols-[3fr_2fr]" aria-label="Featured">
        {featured ? (
          <RecipeCard recipe={featured} size="large" preload />
        ) : (
          <div className="flex aspect-[16/11] items-center justify-center rounded-2xl bg-ink p-8 text-center text-white">
            <p className="text-xl font-bold">The first post is on the way.</p>
          </div>
        )}
        <div className="flex flex-col justify-between gap-6 rounded-2xl bg-brand p-8 text-white sm:p-10">
          <p className="font-display text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
            Cook it.
            <br />
            Eat it.
            <br />
            Rate it.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/recipes"
              className="rounded-full bg-white px-5 py-2.5 text-sm font-bold text-brand-dark hover:bg-brand-soft"
            >
              Recipes
            </Link>
            <Link
              href="/reviews"
              className="rounded-full border-2 border-white px-5 py-2 text-sm font-bold hover:bg-white hover:text-brand-dark"
            >
              Reviews
            </Link>
          </div>
        </div>
      </section>

      <Section title="Latest recipes" href="/recipes">
        <PostGrid posts={without(recipes)} empty="Recipes are on the way." />
      </Section>
      <Section title="Latest reviews" href="/reviews">
        <PostGrid posts={without(reviews)} empty="Reviews are on the way." />
      </Section>
      {blogPosts.length > 0 && (
        <Section title="From the blog" href="/blog">
          <BlogGrid posts={blogPosts} empty="" />
        </Section>
      )}
    </main>
  );
}

function Section({ title, href, children }: { title: string; href: string; children: React.ReactNode }) {
  return (
    <section className="mt-14" aria-labelledby={`${href.slice(1)}-heading`}>
      <div className="mb-6 flex items-end justify-between gap-4">
        <h2 id={`${href.slice(1)}-heading`} className="text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">
          {title}
        </h2>
        <Link href={href} className="inline-block py-1.5 shrink-0 text-sm font-bold text-brand hover:underline">
          See all →
        </Link>
      </div>
      {children}
    </section>
  );
}
