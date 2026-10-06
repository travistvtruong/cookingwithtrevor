import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site-url";

// Public blog is crawlable; signed-in areas and auth routes are not.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/library", "/grocery", "/account", "/login", "/auth", "/search", "/forgot-password", "/reset-password", "/mfa"],
    },
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
