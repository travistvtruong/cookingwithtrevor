import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { PhotoGallery } from "@/components/photo-gallery";
import { ShareButtons } from "@/components/share-buttons";
import { TagLinks } from "@/components/tag-links";
import { bodyText, parseBody } from "@/lib/blog-body";
import { blogPath, formatDate, getPublishedBlogPost, type BlogPost } from "@/lib/blog";
import { shareImageUrl } from "@/lib/share";
import { DEFAULT_SHARE_IMAGE } from "@/lib/share-image";
import { siteUrl } from "@/lib/site-url";

// Built on first visit, cached, rebuilt when the post is saved (plus a 60s refresh).
export const revalidate = 60;

export async function generateStaticParams() {
  return [];
}

function summary(post: BlogPost) {
  const text = post.excerpt.trim() || bodyText(post.body);
  return text.length > 160 ? `${text.slice(0, 157).trimEnd()}…` : text;
}

export async function generateMetadata({ params }: PageProps<"/blog/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPublishedBlogPost(slug);
  if (!post) return {};
  return {
    title: post.title,
    description: summary(post),
    alternates: { canonical: blogPath(post) },
    openGraph: {
      type: "article",
      title: post.title,
      description: summary(post),
      publishedTime: post.published_at ?? undefined,
      images: post.cover_photo_url ? [post.cover_photo_url] : [DEFAULT_SHARE_IMAGE],
    },
  };
}

export default async function BlogPostPage({ params }: PageProps<"/blog/[slug]">) {
  const { slug } = await params;
  const post = await getPublishedBlogPost(slug);
  if (!post) notFound();

  const jsonLd = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: summary(post),
    image: post.cover_photo_url ? [post.cover_photo_url] : undefined,
    datePublished: post.published_at ?? undefined,
    dateModified: post.updated_at,
    author: { "@type": "Person", name: "Trevor" },
    keywords: post.tags.join(", ") || undefined,
  }).replace(/</g, "\\u003c");

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:py-12">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />
      <article>
        <header className="space-y-4">
          <p className="inline-block rounded-full bg-brand-soft px-3 py-1 text-xs font-bold uppercase tracking-wider text-brand-dark">
            Blog
          </p>
          <h1 className="text-3xl font-extrabold leading-tight tracking-tight text-ink sm:text-5xl">{post.title}</h1>
          {post.excerpt && <p className="text-xl leading-relaxed text-stone-700">{post.excerpt}</p>}
          <p className="text-sm text-stone-600">
            <time dateTime={post.published_at ?? undefined}>{formatDate(post.published_at)}</time>
          </p>
          <TagLinks tags={post.tags} />
          <ShareButtons
            url={`${siteUrl()}${blogPath(post)}`}
            title={post.title}
            image={shareImageUrl(post.cover_photo_url, siteUrl())}
          />
        </header>

        {post.cover_photo_url && (
          <div className="relative mt-8 aspect-[3/2] overflow-hidden rounded-2xl bg-stone-100">
            <Image
              src={post.cover_photo_url}
              alt={post.title}
              fill
              preload
              fetchPriority="high"
              sizes="(min-width: 768px) 736px, calc(100vw - 32px)"
              className="object-cover"
            />
          </div>
        )}

        <div className="mt-8 space-y-5 text-lg leading-relaxed text-stone-800">
          {parseBody(post.body).map((block, i) =>
            block.type === "heading" ? (
              <h2 key={i} className="pt-4 text-2xl font-extrabold tracking-tight text-ink">
                {block.text}
              </h2>
            ) : block.type === "list" ? (
              <ul key={i} className="list-disc space-y-2 pl-6 marker:text-brand">
                {block.items.map((item, j) => (
                  <li key={j}>{item}</li>
                ))}
              </ul>
            ) : (
              <p key={i}>{block.text}</p>
            ),
          )}
        </div>

        <PhotoGallery photos={post.photos} title={post.title} />
      </article>
    </main>
  );
}
