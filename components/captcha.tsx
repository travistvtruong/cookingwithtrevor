"use client";

import Script from "next/script";
import { useEffect, useRef, useState } from "react";
import { CAPTCHA_FIELD, turnstileSiteKey } from "@/lib/turnstile";

type Turnstile = {
  render: (el: HTMLElement, options: Record<string, unknown>) => string;
  reset: (id: string) => void;
  remove: (id: string) => void;
};
declare global {
  interface Window {
    turnstile?: Turnstile;
  }
}

// The Turnstile widget (R35), inside a form: puts its token in a hidden field.
// Renders nothing until NEXT_PUBLIC_TURNSTILE_SITE_KEY is set.
// resetKey: change it after each submit, since a token works only once.
export function Captcha({ action, resetKey }: { action: string; resetKey?: unknown }) {
  const siteKey = turnstileSiteKey();
  const box = useRef<HTMLDivElement>(null);
  const widget = useRef<string | null>(null);
  const [ready, setReady] = useState(false);
  const [token, setToken] = useState("");

  // The script may already be there from an earlier page.
  useEffect(() => {
    if (window.turnstile) setTimeout(() => setReady(true), 0);
  }, []);

  useEffect(() => {
    if (!siteKey || !ready || !box.current || !window.turnstile) return;
    widget.current = window.turnstile.render(box.current, {
      sitekey: siteKey,
      action,
      callback: (t: string) => setToken(t),
      "expired-callback": () => setToken(""),
      "error-callback": () => setToken(""),
    });
    return () => {
      if (widget.current) window.turnstile?.remove(widget.current);
      widget.current = null;
    };
  }, [siteKey, ready, action]);

  // A fresh challenge after every submit.
  useEffect(() => {
    if (widget.current && window.turnstile) {
      window.turnstile.reset(widget.current);
      setTimeout(() => setToken(""), 0);
    }
  }, [resetKey]);

  if (!siteKey) return null;
  return (
    <>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        strategy="afterInteractive"
        onReady={() => setReady(true)}
      />
      <div ref={box} className="min-h-16" />
      <input type="hidden" name={CAPTCHA_FIELD} value={token} />
    </>
  );
}
