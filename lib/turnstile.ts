// Cloudflare Turnstile CAPTCHA (R35). Off until the keys are set:
// NEXT_PUBLIC_TURNSTILE_SITE_KEY (public, shows the widget) and, for comments,
// TURNSTILE_SECRET_KEY (server only). Sign-up, sign-in and password reset are
// checked by Supabase itself once CAPTCHA is turned on in its Auth settings.
export function turnstileSiteKey(): string | null {
  return process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || null;
}

// The form field the widget's token travels in.
export const CAPTCHA_FIELD = "captcha_token";

// The token from a submitted form, ready for Supabase's captchaToken option.
export function captchaToken(formData: FormData): string | undefined {
  const token = String(formData.get(CAPTCHA_FIELD) ?? "").trim();
  return token || undefined;
}
