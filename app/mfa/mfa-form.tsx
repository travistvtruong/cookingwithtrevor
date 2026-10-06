"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Step =
  | { kind: "loading" }
  | { kind: "verify"; factorId: string } // has an authenticator: enter a code
  | { kind: "enroll"; factorId: string; qr: string; secret: string } // first time: scan, then enter a code
  | { kind: "error"; message: string };

// While setup is unfinished, remember the QR code in this tab so a reload (or
// a phone browser reloading after you switch to the authenticator app) shows
// the SAME code instead of a new one the app doesn't know. Cleared on success.
const PENDING_KEY = "cwt-mfa-pending-enrollment";
type Pending = { factorId: string; qr: string; secret: string };

function readPending(): Pending | null {
  try {
    const raw = sessionStorage.getItem(PENDING_KEY);
    return raw ? (JSON.parse(raw) as Pending) : null;
  } catch {
    return null;
  }
}
function writePending(p: Pending | null) {
  try {
    if (p) sessionStorage.setItem(PENDING_KEY, JSON.stringify(p));
    else sessionStorage.removeItem(PENDING_KEY);
  } catch {
    // Storage unavailable (e.g. private mode): setup still works, just without reload protection.
  }
}

// TOTP two-factor: enroll an authenticator app on first use, then ask for a
// 6-digit code. A verified code upgrades the session to AAL2.
export function MfaForm({ next }: { next: string }) {
  const [step, setStep] = useState<Step>({ kind: "loading" });
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  // Effects run twice in development; enrolling twice at once would fail.
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const mfa = createClient().auth.mfa;
    (async () => {
      const { data: aal } = await mfa.getAuthenticatorAssuranceLevel();
      if (aal?.currentLevel === "aal2") return router.replace(next);

      const { data: factors, error: listError } = await mfa.listFactors();
      if (listError) return setStep({ kind: "error", message: listError.message });

      const verified = factors.totp[0];
      if (verified) {
        writePending(null);
        return setStep({ kind: "verify", factorId: verified.id });
      }

      // Resume an unfinished setup from this tab if Supabase still has it.
      const unverified = factors.all.filter((f) => f.factor_type === "totp" && f.status === "unverified");
      const pending = readPending();
      if (pending && unverified.some((f) => f.id === pending.factorId)) {
        return setStep({ kind: "enroll", ...pending });
      }
      await startEnrollment(unverified.map((f) => f.id));
    })();
  }, [next, router]);

  // Remove half-finished setups, then create a new QR code and remember it in this tab.
  async function startEnrollment(staleFactorIds: string[]) {
    const mfa = createClient().auth.mfa;
    setStep({ kind: "loading" });
    for (const factorId of staleFactorIds) await mfa.unenroll({ factorId });
    const { data: enrolled, error: enrollError } = await mfa.enroll({
      factorType: "totp",
      friendlyName: "cookingwithtrevor",
    });
    if (enrollError || !enrolled) {
      writePending(null);
      return setStep({
        kind: "error",
        message: enrollError?.message ?? "Couldn't start two-factor setup. Is MFA turned on in Supabase?",
      });
    }
    const fresh = { factorId: enrolled.id, qr: enrolled.totp.qr_code, secret: enrolled.totp.secret };
    writePending(fresh);
    setStep({ kind: "enroll", ...fresh });
  }

  async function startOver() {
    if (step.kind !== "enroll") return;
    setError(null);
    setCode("");
    await startEnrollment([step.factorId]);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (step.kind !== "verify" && step.kind !== "enroll") return;
    setBusy(true);
    setError(null);
    const { error: verifyError } = await createClient().auth.mfa.challengeAndVerify({
      factorId: step.factorId,
      code: code.replace(/\s/g, ""),
    });
    setBusy(false);
    if (verifyError) {
      setCode("");
      return setError(
        `That code didn't work. Use the current code (they change every 30 seconds) and check your phone's ` +
          `clock is set automatically.${verifyError.code ? ` (Error: ${verifyError.code})` : ""}`,
      );
    }
    writePending(null);
    router.replace(next);
    router.refresh();
  }

  if (step.kind === "loading") return <p className="text-stone-600" role="status">Checking your account…</p>;
  if (step.kind === "error") return <p role="alert" className="text-red-700">{step.message}</p>;

  return (
    <form onSubmit={submit} className="space-y-6">
      {step.kind === "enroll" && (
        <div className="space-y-3 rounded-2xl border border-stone-200 bg-white p-5">
          <p className="font-semibold text-ink">1. Scan this with your authenticator app</p>
          {/* QR code is an SVG data URL from Supabase. */}
          <Image src={step.qr} alt="QR code for your authenticator app" width={180} height={180} unoptimized />
          <p className="text-sm text-stone-600">
            Can&apos;t scan? Enter this key instead:{" "}
            <code className="break-all rounded bg-stone-100 px-1.5 py-0.5 font-mono text-stone-800">{step.secret}</code>
          </p>
          <p className="text-sm text-stone-600">
            On a phone, add the key in your authenticator app. If you leave this page, the same QR code will be here when
            you come back.
          </p>
          <p className="font-semibold text-ink">2. Enter the 6-digit code it shows</p>
        </div>
      )}

      <div className="space-y-1">
        <label htmlFor="code" className="text-sm font-medium text-stone-700">
          6-digit code
        </label>
        <input
          id="code"
          name="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9 ]{6,7}"
          maxLength={7}
          required
          autoFocus
          value={code}
          onChange={(e) => setCode(e.target.value)}
          className="w-full rounded-md border border-stone-300 bg-white px-3 py-2 font-mono text-2xl tracking-[0.3em] text-stone-900 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
        />
      </div>

      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}

      <button
        type="submit"
        disabled={busy}
        className="w-full rounded-full bg-brand px-5 py-3 font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
      >
        {busy ? "Checking…" : step.kind === "enroll" ? "Turn on two-factor" : "Verify"}
      </button>

      {step.kind === "enroll" && (
        <button
          type="button"
          onClick={startOver}
          disabled={busy}
          className="w-full rounded-full border border-stone-300 bg-white px-5 py-2.5 text-sm font-semibold text-stone-800 hover:bg-stone-50 disabled:opacity-60"
        >
          Start over with a new QR code
        </button>
      )}
    </form>
  );
}
