"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/safe-next";
import { siteUrl } from "@/lib/site-url";
import { captchaToken } from "@/lib/turnstile";

export type AuthState = { error?: string; message?: string };


function readCredentials(formData: FormData) {
  return {
    email: String(formData.get("email") ?? "").trim(),
    password: String(formData.get("password") ?? ""),
    next: safeNext(formData.get("next")),
  };
}

export async function signIn(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const { email, password, next } = readCredentials(formData);
  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
    options: { captchaToken: captchaToken(formData) },
  });
  if (error) return { error: error.message };

  redirect(next);
}

export async function signUp(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const { email, password, next } = readCredentials(formData);
  const name = String(formData.get("name") ?? "").trim();
  if (password.length < 8) return { error: "Password must be at least 8 characters." };
  // Checked here as well as in the form, so a typo can't lock someone out of a new account.
  if (password !== String(formData.get("confirm_password") ?? "")) {
    return { error: "The two passwords don't match." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { name },
      emailRedirectTo: `${siteUrl()}/auth/callback?next=${encodeURIComponent(next)}`,
      captchaToken: captchaToken(formData),
    },
  });
  if (error) return { error: error.message };

  // With email confirmation on (Supabase default), there is no session yet.
  if (!data.session) return { message: "Check your email to confirm your account." };
  redirect(next);
}
