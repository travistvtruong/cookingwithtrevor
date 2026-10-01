"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Status = "loading" | "signed-out" | "saved" | "not-saved";

// Runs in the browser so the post page itself stays static and cacheable.
// Row-level security limits each user to their own saved_recipes rows.
export function SaveButton({ recipeId, slug }: { recipeId: string; slug: string }) {
  const [status, setStatus] = useState<Status>("loading");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    (async () => {
      const { data } = await supabase.auth.getSession();
      const userId = data.session?.user.id;
      if (!userId) return setStatus("signed-out");

      const { count } = await supabase
        .from("saved_recipes")
        .select("recipe_id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("recipe_id", recipeId);
      setStatus(count ? "saved" : "not-saved");
    })();
  }, [recipeId]);

  async function toggle() {
    const supabase = createClient();
    const { data } = await supabase.auth.getSession();
    const userId = data.session?.user.id;
    if (!userId) return router.push(`/login?next=/recipes/${slug}`);

    setBusy(true);
    setError(false);
    const { error } =
      status === "saved"
        ? await supabase.from("saved_recipes").delete().eq("user_id", userId).eq("recipe_id", recipeId)
        : await supabase.from("saved_recipes").insert({ user_id: userId, recipe_id: recipeId });
    setBusy(false);

    if (error) return setError(true);
    setStatus(status === "saved" ? "not-saved" : "saved");
  }

  const base = "rounded-full border px-5 py-2.5 text-sm font-semibold disabled:opacity-60";

  if (status === "loading") {
    return <span className={`${base} invisible border-transparent`}>Save to library</span>;
  }

  if (status === "signed-out") {
    return (
      <Link
        href={`/login?next=/recipes/${slug}`}
        className={`${base} border-stone-300 bg-white text-stone-800 hover:bg-stone-50`}
      >
        Save to library
      </Link>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={toggle}
        disabled={busy}
        aria-pressed={status === "saved"}
        className={
          status === "saved"
            ? `${base} border-brand bg-brand-tint text-brand-dark hover:bg-brand-soft`
            : `${base} border-stone-300 bg-white text-stone-800 hover:bg-stone-50`
        }
      >
        {status === "saved" ? "✓ Saved" : "Save to library"}
      </button>
      {status === "saved" && (
        <Link href={`/library/${recipeId}`} className="inline-block py-1.5 text-sm text-brand hover:underline">
          Add notes
        </Link>
      )}
      {error && <span className="text-sm text-red-700">Couldn&apos;t update. Try again.</span>}
    </>
  );
}
