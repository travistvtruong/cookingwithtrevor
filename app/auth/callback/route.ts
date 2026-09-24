import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/safe-next";

// Landing point for Google OAuth and the default Supabase confirmation email.
// Exchanges the one-time code for a session cookie, then continues to `next`.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const next = safeNext(searchParams.get("next"));

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${next}`);

    // Supabase only issues a code after verifying the email link, so the account
    // is confirmed. The exchange fails when the link opens in a different browser
    // than the one used to sign up; the user just needs to sign in there.
    return NextResponse.redirect(`${origin}/login?confirmed=1&next=${encodeURIComponent(next)}`);
  }

  const reason = searchParams.get("error_code") === "otp_expired" ? "expired" : "callback";
  return NextResponse.redirect(`${origin}/login?error=${reason}`);
}
