import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Montserrat } from "next/font/google";
import { SiteNav } from "@/components/site-nav";
import { UserMenu } from "@/components/user-menu";
import { hasPublishedBlogPosts } from "@/lib/blog";
import { siteUrl } from "@/lib/site-url";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

// Bold geometric headings. next/font self-hosts it, so visitors' browsers
// never contact Google.
const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: {
    default: "cookingwithtrevor",
    template: "%s · cookingwithtrevor",
  },
  description: "Recipes, food reviews and stories from the kitchen.",
};

// The header checks whether the blog has posts; refresh that at least every
// minute on otherwise-static pages (publishing also refreshes every page).
export const revalidate = 60;

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const showBlog = await hasPublishedBlogPosts();

  return (
    <html lang="en" className={`${geistSans.variable} ${montserrat.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        {/* First tab stop: lets keyboard users jump past the header. */}
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-50 focus:rounded-md focus:bg-white focus:px-3 focus:py-2 focus:text-sm focus:font-medium focus:text-brand focus:shadow"
        >
          Skip to main content
        </a>
        <header className="bg-white">
          <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4">
            <Link
              href="/"
              className="shrink-0 font-display text-lg font-extrabold tracking-tight text-ink sm:text-2xl"
            >
              cookingwithtrevor
            </Link>
            <div className="flex items-center gap-4">
              <Link
                href="/search"
                aria-label="Search"
                className="rounded-full p-1.5 text-ink hover:bg-stone-100 hover:text-brand"
              >
                <svg aria-hidden viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <circle cx="11" cy="11" r="7" />
                  <path d="m20 20-3.5-3.5" />
                </svg>
              </Link>
              <UserMenu />
            </div>
          </div>
          <SiteNav showBlog={showBlog} />
        </header>
        <div id="main" tabIndex={-1} className="flex flex-1 flex-col outline-none">
          {children}
        </div>
        <footer className="mt-16 bg-ink text-stone-300">
          <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-10 sm:flex-row sm:items-center sm:justify-between">
            <p className="font-display text-lg font-extrabold text-white">
              cookingwithtrevor
            </p>
            <nav aria-label="Footer" className="flex gap-6 text-sm">
              <Link href="/recipes" className="hover:text-white">Recipes</Link>
              <Link href="/reviews" className="hover:text-white">Reviews</Link>
              {showBlog && (
                <Link href="/blog" className="hover:text-white">Blog</Link>
              )}
            </nav>
            <p className="text-sm">© {new Date().getFullYear()} cookingwithtrevor</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
