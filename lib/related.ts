// "More like this" (R34): other posts of the same kind, the ones sharing the
// most tags first, then the newest. Pure, so it's easy to test.
export function relatedPosts<T extends { id: string; tags: string[]; published_at: string | null }>(
  current: { id: string; tags: string[] },
  candidates: T[],
  limit = 3,
): T[] {
  const mine = new Set(current.tags);
  return candidates
    .filter((post) => post.id !== current.id)
    .map((post) => ({ post, shared: post.tags.filter((t) => mine.has(t)).length }))
    .sort(
      (a, b) =>
        b.shared - a.shared || (b.post.published_at ?? "").localeCompare(a.post.published_at ?? ""),
    )
    .slice(0, limit)
    .map(({ post }) => post);
}
