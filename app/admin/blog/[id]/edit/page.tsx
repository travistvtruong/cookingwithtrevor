import Link from "next/link";
import { notFound } from "next/navigation";
import { BlogForm } from "@/components/blog-form";
import { requireAdmin } from "@/lib/auth";
import { blogPath, getBlogPostForEdit } from "@/lib/blog";
import { deleteBlogPost, saveBlogPost } from "../../actions";

export default async function EditBlogPostPage({ params }: PageProps<"/admin/blog/[id]/edit">) {
  const { id } = await params;
  const { supabase } = await requireAdmin();
  const post = await getBlogPostForEdit(supabase, id);
  if (!post) notFound();

  return (
    <main className="max-w-2xl">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-extrabold text-ink">Edit blog post</h1>
          <span
            className={
              post.is_public
                ? "rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800"
                : "rounded-full bg-stone-100 px-2 py-0.5 text-xs font-medium text-stone-700"
            }
          >
            {post.is_public ? "Published" : "Draft"}
          </span>
        </div>
        {post.is_public && (
          <Link href={blogPath(post)} className="text-sm text-brand hover:underline">
            View post
          </Link>
        )}
      </div>
      <BlogForm
        action={saveBlogPost}
        deleteAction={deleteBlogPost.bind(null, post.id, post.slug)}
        id={post.id}
        savedSlug={post.slug}
        initial={{
          title: post.title,
          slug: post.slug,
          excerpt: post.excerpt,
          body: post.body,
          cover_photo_url: post.cover_photo_url ?? "",
          tags: post.tags.join(", "),
          is_public: post.is_public,
        }}
      />
    </main>
  );
}
