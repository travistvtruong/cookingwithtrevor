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
        <header className="border-b border-stone-200 bg-white">
          <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
            <Link href="/" className="text-lg font-semibold tracking-tight text-stone-900">
              cookingwithtrevor
            </Link>
            <UserMenu />
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}
