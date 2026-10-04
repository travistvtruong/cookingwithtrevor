"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { siteUrl } from "@/lib/site-url";

export type PasswordState = { error?: string; message?: string; needsMfa?: boolean };

const MIN_PASSWORD = 8;
const SENT =
  "If there's an account for that email, a reset link is on its way. Check your inbox (and spam folder).";

// Step 1: email a reset link. Always gives the same answer, so this can't be
// used to find out which emails have accounts.
export async function requestPasswordReset(_prev: PasswordState, formData: FormData): Promise<PasswordState> {
  const email = String(formData.get("email") ?? "").trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Enter the email you signed up with." };

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    // Used by Supabase's default email template; the custom template links to
    // /auth/confirm?type=recovery&next=/reset-password instead (see README).
    redirectTo: `${siteUrl()}/auth/callback?next=${encodeURIComponent("/reset-password")}`,
  });
  if (error?.code === "over_email_send_rate_limit" || error?.status === 429) {
    return { error: "Too many reset emails. Please wait a few minutes and try again." };
  }
  return { message: SENT };
}

// Step 2: on the page the email link opens (now signed in), set a new password.
export async function updatePassword(_prev: PasswordState, formData: FormData): Promise<PasswordState> {
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  if (password.length < MIN_PASSWORD) return { error: `Use at least ${MIN_PASSWORD} characters.` };
  if (password !== confirm) return { error: "The two passwords don't match." };

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth?.claims.sub) return { error: "Your reset link has expired. Request a new one." };

  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    // Accounts with 2FA must enter a code before changing the password.
    if (error.code === "insufficient_aal") {
      return { needsMfa: true, error: "Your account uses two-factor authentication. Enter your code first." };
    }
    if (error.code === "same_password") return { error: "That's your current password. Choose a new one." };
    if (error.code === "weak_password") return { error: "That password is too easy to guess. Try a longer one." };
    return { error: `Couldn't change your password: ${error.message}` };
  }

  redirect("/?password=updated");
}
