// Visitor analytics (R36): off unless NEXT_PUBLIC_ANALYTICS is "vercel".
export function analyticsEnabled(): boolean {
  return process.env.NEXT_PUBLIC_ANALYTICS === "vercel";
}

// Pages that are about one person, not the public site: never counted.
const PRIVATE = ["/library", "/grocery", "/account", "/admin", "/auth", "/login", "/mfa", "/reset-password", "/forgot-password"];

// What gets reported for a page view: the path only (query strings can hold
// search terms or one-time sign-in tokens), and nothing for private pages.
export function analyticsUrl(raw: string): string | null {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (PRIVATE.some((p) => url.pathname === p || url.pathname.startsWith(`${p}/`))) return null;
  return `${url.origin}${url.pathname}`;
}
