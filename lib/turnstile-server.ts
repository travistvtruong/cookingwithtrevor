import "server-only";

const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

// Checks a Turnstile token with Cloudflare. With no secret configured the
// check is off and everything passes.
export async function verifyCaptcha(token: string | undefined, action: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return true;
  if (!token) return false;
  try {
    const response = await fetch(VERIFY_URL, {
      method: "POST",
      body: new URLSearchParams({ secret, response: token }),
      signal: AbortSignal.timeout(5000),
    });
    const result = (await response.json()) as { success?: boolean; action?: string };
    return result.success === true && (!result.action || result.action === action);
  } catch {
    return false; // can't verify: treat as failed rather than let it through
  }
}
