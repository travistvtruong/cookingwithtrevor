"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const SECTIONS = [
  { href: "/recipes", label: "Recipes" },
  { href: "/reviews", label: "Reviews" },
];

// The section row under the logo. Highlights the current section.
export function SiteNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Sections" className="border-y border-stone-200">
      <ul className="mx-auto flex max-w-6xl gap-8 px-4">
        {SECTIONS.map(({ href, label }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <li key={href}>
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
        })}
      </ul>
    </nav>
  );
}
