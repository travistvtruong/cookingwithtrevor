"use client";

import { useEffect } from "react";

// Registers public/sw.js (offline grocery lists, R11). Production only, so the
// dev server's constantly changing files are never cached.
export function ServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).catch(() => {
      // Offline support is a bonus; the site works without it.
    });
  }, []);
  return null;
}
