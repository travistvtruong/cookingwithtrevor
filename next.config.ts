import type { NextConfig } from "next";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

// Baseline security headers for every response. A full Content-Security-Policy
// is a planned follow-up (it needs testing against Next's inline scripts).
const securityHeaders = [
  // Don't let other sites frame this one (clickjacking).
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
  // Browsers must trust the declared content type.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Send only the origin to other sites, never full URLs.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // HTTPS only, for two years (Vercel serves HTTPS).
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  // Features the site never uses. (Camera stays allowed: phone photo uploads.)
  { key: "Permissions-Policy", value: "microphone=(), geolocation=(), payment=(), usb=()" },
];

const nextConfig: NextConfig = {
  images: {
    // Recipe photos live in the public Supabase Storage bucket.
    remotePatterns: supabaseUrl
      ? [new URL(`${supabaseUrl}/storage/v1/object/public/recipe-photos/**`)]
      : [],
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
