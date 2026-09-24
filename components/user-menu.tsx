"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

// Auth state is read in the browser so blog pages stay statically cacheable.
export function UserMenu() {
  const [email, setEmail] = useState<string | null | undefined>(undefined);
  const pathname = usePathname();
  const router = useRouter();

  // Sign-in happens in a Server Function, which sets the auth cookie without
  // firing a browser auth event, so re-read the session after each navigation.
  useEffect(() => {
    createClient()
      .auth.getSession()
      .then(({ data }) => setEmail(data.session?.user.email ?? null));
  }, [pathname]);

  // Catches changes made in the browser: sign-out, token refresh, other tabs.
  useEffect(() => {
    const { data } = createClient().auth.onAuthStateChange((_event, session) =>
      setEmail(session?.user.email ?? null),
    );
    return () => data.subscription.unsubscribe();
  }, []);

  async function handleSignOut() {
    await createClient().auth.signOut();
    router.push("/");
    router.refresh();
  }

  if (email === undefined) return <span className="h-5 w-16" aria-hidden />;

  if (!email) {
    return (
      <Link href="/login" className="text-sm font-medium text-orange-700 hover:underline">
        Sign in
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="hidden max-w-40 truncate text-stone-600 sm:inline">{email}</span>
      <button type="button" onClick={handleSignOut} className="font-medium text-orange-700 hover:underline">
        Sign out
      </button>
    </div>
  );
}
