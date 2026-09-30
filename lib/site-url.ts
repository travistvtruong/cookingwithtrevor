// The site's public origin, used for metadata and auth redirects.
// Tolerates common env-var mistakes (missing https://, quotes, spaces) instead of
// failing the build, and falls back to the production URL Vercel provides.
export function siteUrl(): string {
  const candidates = [
    process.env.NEXT_PUBLIC_SITE_URL,
    process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL,
    "http://localhost:3000",
  ];

  for (const candidate of candidates) {
    const raw = candidate?.trim().replace(/^["']|["']$/g, "");
    if (!raw) continue;
    const withScheme = /^https?:\/\//i.test(raw)
      ? raw
      : `${raw.startsWith("localhost") ? "http" : "https"}://${raw}`;
    try {
      return new URL(withScheme).origin;
    } catch {
      console.warn(`Ignoring invalid site URL from environment: ${candidate === process.env.NEXT_PUBLIC_SITE_URL ? "NEXT_PUBLIC_SITE_URL" : "fallback"}`);
    }
  }
  return "http://localhost:3000";
}
