import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PostView, postMetadata } from "@/components/post-view";
import { getPublishedRecipe } from "@/lib/recipes";

// Pages are built on first visit, cached, and rebuilt when the post is saved.
// The 60s refresh picks up changes made on another server or in the database.
export const revalidate = 60;

export async function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }: PageProps<"/reviews/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  return postMetadata(await getPublishedRecipe(slug, "review"));
}

export default async function Page({ params }: PageProps<"/reviews/[slug]">) {
  const { slug } = await params;
  const post = await getPublishedRecipe(slug, "review");
  if (!post) notFound();
  return <PostView post={post} />;
}
