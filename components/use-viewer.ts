"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export type Viewer = { userId: string | null; email: string | null; isAdmin: boolean };

// Who's viewing, read in the browser so public pages stay statically cached.
// `undefined` while loading. isAdmin only decides which links to show;
// admin pages and the database enforce access themselves.
export function useViewer(): Viewer | undefined {
  const [viewer, setViewer] = useState<Viewer | undefined>(undefined);
  const pathname = usePathname();

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    async function load(user: { id: string; email?: string } | null | undefined) {
      if (!user) return !cancelled && setViewer({ userId: null, email: null, isAdmin: false });
      const { data } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
      if (!cancelled) setViewer({ userId: user.id, email: user.email ?? null, isAdmin: data?.role === "admin" });
    }

    // Sign-in runs in a Server Function (no browser auth event), so re-read the
    // session on every navigation; the listener catches sign-out and other tabs.
    supabase.auth.getSession().then(({ data }) => load(data.session?.user));
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      load(session?.user);
    });
    return () => {
      cancelled = true;
      data.subscription.unsubscribe();
    };
  }, [pathname]);

  return viewer;
}
