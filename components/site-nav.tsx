"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useViewer } from "./use-viewer";

type Item = { href: string; label: string; badge?: number };

const SECTIONS: Item[] = [
  { href: "/recipes", label: "Recipes" },
  { href: "/reviews", label: "Reviews" },
];
const BLOG: Item = { href: "/blog", label: "Blog" };

// The row under the logo: the blog's sections, then (when signed in) your own
// pages, and the dashboard for the admin. Scrolls sideways on narrow screens
// instead of making the page wider.
// showBlog: only once a blog post is published (decided on the server).
export function SiteNav({ showBlog }: { showBlog: boolean }) {
  const pathname = usePathname();
  const viewer = useViewer();

  const personal: Item[] = viewer?.userId
    ? [
        { href: "/library", label: "Library" },
        { href: "/grocery", label: "Lists" },
        { href: "/account", label: "Account" },
        ...(viewer.isAdmin ? [{ href: "/admin", label: "Dashboard", badge: viewer.pendingComments }] : []),
      ]
    : [];

  const link = ({ href, label, badge }: Item) => {
    const active = pathname === href || pathname.startsWith(`${href}/`);
    return (
      <li key={href} className="shrink-0">
        <Link
          href={href}
          aria-current={active ? "page" : undefined}
          className={`inline-block border-b-2 py-3 font-display text-sm font-bold uppercase tracking-widest ${
            active ? "border-brand text-ink" : "border-transparent text-stone-600 hover:text-ink"
          }`}
        >
          {label}
          {badge ? (
            <span className="ml-1.5 rounded-full bg-brand px-1.5 align-middle text-xs leading-5 tracking-normal text-white">
              {badge}
              <span className="sr-only"> comments waiting for review</span>
            </span>
          ) : null}
        </Link>
      </li>
    );
  };

  return (
    <nav aria-label="Main" className="border-y border-stone-200">
      <ul className="mx-auto flex max-w-6xl items-center gap-6 overflow-x-auto px-4 sm:gap-8">
        {(showBlog ? [...SECTIONS, BLOG] : SECTIONS).map(link)}
        {personal.length > 0 && (
          <>
            <li aria-hidden className="h-4 w-px shrink-0 bg-stone-300" />
            {personal.map(link)}
          </>
        )}
      </ul>
    </nav>
  );
}
