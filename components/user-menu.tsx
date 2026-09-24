"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { signOut } from "@/app/login/actions";

// Auth state is read in the browser so blog pages stay statically cacheable.
export function UserMenu() {
  const [email, setEmail] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data }) => setEmail(data.session?.user.email ?? null));
    const { data } = supabase.auth.onAuthStateChange((_event, session) =>
      setEmail(session?.user.email ?? null),
    );
    return () => data.subscription.unsubscribe();
  }, []);

  if (email === undefined) return <span className="h-5 w-16" aria-hidden />;

  if (!email) {
    return (
      <Link href="/login" className="text-sm font-medium text-orange-700 hover:underline">
        Sign in
      </Link>
    );
  }

  return (
    <form action={signOut} className="flex items-center gap-3 text-sm">
      <span className="hidden max-w-40 truncate text-stone-600 sm:inline">{email}</span>
      <button type="submit" className="font-medium text-orange-700 hover:underline">
        Sign out
      </button>
    </form>
  );
}
