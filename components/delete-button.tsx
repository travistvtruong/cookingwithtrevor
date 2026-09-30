"use client";

import { useState, useTransition } from "react";

// Confirms, runs a delete Server Action, and shows its error if it returns one
// (on success the action redirects away).
export function DeleteButton({
  action,
  label,
  confirmMessage,
}: {
  action: () => Promise<{ error?: string } | void>;
  label: string;
  confirmMessage: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (!confirm(confirmMessage)) return;
          setError(null);
          startTransition(async () => {
            const result = await action();
            if (result?.error) setError(result.error);
          });
        }}
        className="text-sm font-medium text-red-700 hover:underline disabled:opacity-60"
      >
        {pending ? "Deleting…" : label}
      </button>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    </div>
  );
}
