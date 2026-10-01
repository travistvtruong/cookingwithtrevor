import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Dashboard",
  robots: { index: false },
};

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  await requireAdmin();

  return (
    <div className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
      <nav aria-label="Dashboard" className="mb-8 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
        <Link href="/admin" className="font-semibold text-stone-900">
          Dashboard
        </Link>
        <Link href="/admin/new" className="inline-block py-1.5 font-medium text-brand hover:underline">
          New recipe
        </Link>
        <Link href="/admin/new?kind=review" className="inline-block py-1.5 font-medium text-brand hover:underline">
          New review
        </Link>
        <Link href="/admin/blog/new" className="inline-block py-1.5 font-medium text-brand hover:underline">
          New blog post
        </Link>
        <Link href="/admin/moderation" className="inline-block py-1.5 font-medium text-stone-700 hover:underline">
          Moderation
        </Link>
        <Link href="/admin/audit" className="inline-block py-1.5 font-medium text-stone-700 hover:underline">
          Audit log
        </Link>
      </nav>
      {children}
    </div>
  );
}
