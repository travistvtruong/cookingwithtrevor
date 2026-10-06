"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { countPendingComments } from "@/lib/moderation";
import { createClient } from "@/lib/supabase/client";

export type Viewer = {
  userId: string | null;
  email: string | null;
  isAdmin: boolean;
  // Comments held for review (admin only, 0 otherwise).
  pendingComments: number;
};

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
      if (!user) return !cancelled && setViewer({ userId: null, email: null, isAdmin: false, pendingComments: 0 });
      const { data } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
      const isAdmin = data?.role === "admin";
      const pendingComments = isAdmin ? await countPendingComments(supabase) : 0;
      if (!cancelled) setViewer({ userId: user.id, email: user.email ?? null, isAdmin, pendingComments });
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
