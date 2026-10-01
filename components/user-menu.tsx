"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useViewer } from "./use-viewer";

// Top-right of the header: sign in / sign out. Navigation lives in SiteNav.
export function UserMenu() {
  const viewer = useViewer();
  const router = useRouter();

  async function handleSignOut() {
    await createClient().auth.signOut();
    router.push("/");
    router.refresh();
  }

  if (viewer === undefined) return <span className="h-5 w-16" aria-hidden />;

  if (!viewer.userId) {
    return (
      <Link href="/login" className="inline-block py-1.5 text-sm font-semibold text-brand hover:underline">
        Sign in
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-4 text-sm">
      <span className="hidden max-w-48 truncate text-stone-600 md:inline">{viewer.email}</span>
      <button type="button" onClick={handleSignOut} className="inline-block py-1.5 font-semibold text-brand hover:underline">
        Sign out
      </button>
    </div>
  );
}
