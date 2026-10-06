"use client";

import { Analytics as VercelAnalytics } from "@vercel/analytics/next";
import { analyticsEnabled, analyticsUrl } from "@/lib/analytics";

// Cookie-free page counts from Vercel Web Analytics (R36), when turned on.
export function Analytics() {
  if (!analyticsEnabled()) return null;
  return (
    <VercelAnalytics
      beforeSend={(event) => {
        const url = analyticsUrl(event.url);
        return url ? { ...event, url } : null;
      }}
    />
  );
}
