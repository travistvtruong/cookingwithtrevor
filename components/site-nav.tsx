"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useViewer } from "./use-viewer";

type Item = { href: string; label: string };

const SECTIONS: Item[] = [
  { href: "/recipes", label: "Recipes" },
  { href: "/reviews", label: "Reviews" },
];

// The row under the logo: the blog's sections, then (when signed in) your own
// pages, and the dashboard for the admin. Scrolls sideways on narrow screens
// instead of making the page wider.
export function SiteNav() {
  const pathname = usePathname();
  const viewer = useViewer();

  const personal: Item[] = viewer?.userId
    ? [
        { href: "/library", label: "Library" },
        { href: "/grocery", label: "Lists" },
        ...(viewer.isAdmin ? [{ href: "/admin", label: "Dashboard" }] : []),
      ]
    : [];

  const link = ({ href, label }: Item) => {
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
        </Link>
      </li>
    );
  };

  return (
    <nav aria-label="Main" className="border-y border-stone-200">
      <ul className="mx-auto flex max-w-6xl items-center gap-6 overflow-x-auto px-4 sm:gap-8">
        {SECTIONS.map(link)}
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
