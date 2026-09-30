import type { Metadata } from "next";
import Link from "next/link";
import { Geist } from "next/font/google";
import { UserMenu } from "@/components/user-menu";
import { siteUrl } from "@/lib/site-url";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: {
    default: "cookingwithtrevor",
    template: "%s · cookingwithtrevor",
  },
  description: "Recipes, plus a personal recipe library and grocery lists.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        {/* First tab stop: lets keyboard users jump past the header. */}
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-50 focus:rounded-md focus:bg-white focus:px-3 focus:py-2 focus:text-sm focus:font-medium focus:text-orange-700 focus:shadow"
        >
          Skip to main content
        </a>
        <header className="border-b border-stone-200 bg-white">
          <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-3 px-4">
            <Link href="/" className="shrink-0 text-base font-semibold tracking-tight text-stone-900 sm:text-lg">
              cookingwithtrevor
            </Link>
            <UserMenu />
          </div>
        </header>
        <div id="main" tabIndex={-1} className="flex flex-1 flex-col outline-none">
          {children}
        </div>
      </body>
    </html>
  );
}
