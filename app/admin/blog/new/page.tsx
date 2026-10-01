import { BlogForm } from "@/components/blog-form";
import { EMPTY_BLOG_POST } from "@/lib/blog-form";
import { saveBlogPost } from "../actions";

export default function NewBlogPostPage() {
  return (
    <main className="max-w-2xl">
      <h1 className="mb-6 text-2xl font-extrabold text-ink">New blog post</h1>
      <BlogForm action={saveBlogPost} initial={EMPTY_BLOG_POST} />
    </main>
  );
}
