// Browser-side helpers for offline grocery lists (R11).

// Must match the cache name in public/sw.js.
const PAGE_CACHE = "cwt-grocery-pages-v1";
const PENDING_KEY = "cwt-grocery-pending-ticks";

// item id -> checked
export type PendingTicks = Record<string, boolean>;

const CHANGE_EVENT = "cwt-pending-ticks-change";

// The raw stored text, for useSyncExternalStore (a string compares by value).
export function pendingSnapshot(): string {
  try {
    return localStorage.getItem(PENDING_KEY) ?? "{}";
  } catch {
    return "{}";
  }
}

export function parsePending(raw: string): PendingTicks {
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

export function readPending(): PendingTicks {
  return parsePending(pendingSnapshot());
}

// Re-render when the queue changes here or in another tab.
export function subscribePending(onChange: () => void): () => void {
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

export function writePending(pending: PendingTicks) {
  try {
    if (Object.keys(pending).length === 0) localStorage.removeItem(PENDING_KEY);
    else localStorage.setItem(PENDING_KEY, JSON.stringify(pending));
  } catch {
    // Storage blocked (private mode): ticks just won't survive a reload.
  }
  if (typeof window !== "undefined") window.dispatchEvent(new Event(CHANGE_EVENT));
}

// Did a save fail because there's no connection (rather than being refused)?
export function isNetworkError(error: { message?: string } | null): boolean {
  if (typeof navigator !== "undefined" && !navigator.onLine) return true;
  return /failed to fetch|networkerror|load failed|network request failed/i.test(error?.message ?? "");
}

// Saved copies of someone's lists must not outlive their session on this device.
export async function clearOfflineData() {
  writePending({});
  try {
    if ("caches" in window) await caches.delete(PAGE_CACHE);
  } catch {
    // Nothing cached, or caches unavailable.
  }
}
