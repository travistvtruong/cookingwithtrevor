import Link from "next/link";
import { tagLabel, tagPath } from "@/lib/tags";

// A post's tags as links to their tag pages (R33).
export function TagLinks({ tags, className = "" }: { tags: string[]; className?: string }) {
  if (tags.length === 0) return null;
  return (
    <ul className={`flex flex-wrap gap-2 ${className}`} aria-label="Tags">
      {tags.map((tag) => (
        <li key={tag}>
          <Link
            href={tagPath(tag)}
            className="inline-block rounded-full bg-stone-100 px-3 py-1 text-sm text-stone-700 hover:bg-brand-tint hover:text-brand-dark"
          >
            #{tagLabel(tag)}
          </Link>
        </li>
      ))}
    </ul>
  );
}
