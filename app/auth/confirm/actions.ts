"use server";

import type { EmailOtpType } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/safe-next";

export type ConfirmState = { error?: string };

const TYPES: EmailOtpType[] = ["email", "signup", "recovery", "invite", "magiclink", "email_change"];

// Runs when the person presses the button on /auth/confirm, never when the
// page is merely opened, so email security scanners that open links can't
// use up the one-time token.
export async function verifyEmailLink(_prev: ConfirmState, formData: FormData): Promise<ConfirmState> {
  const tokenHash = String(formData.get("token_hash") ?? "");
  const type = String(formData.get("type") ?? "") as EmailOtpType;
  if (!tokenHash || !TYPES.includes(type)) return { error: "This link is incomplete. Request a new one." };

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
  if (error) {
    return {
      error:
        type === "recovery"
          ? "This reset link has expired or was already used. Request a new one."
          : "This link has expired or was already used. If you already confirmed your email, just sign in.",
    };
  }

  const fallback = type === "recovery" ? "/reset-password" : "/";
  redirect(safeNext(formData.get("next") || fallback));
}
