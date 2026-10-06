"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  title: string;
  ingredients: string[];
  steps: string[];
  onClose: () => void;
};

// Cook mode (R31): one step at a time in large text, an ingredient checklist,
// and the screen kept awake (Screen Wake Lock API) while it's open.
export function CookMode({ title, ingredients, steps, onClose }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [step, setStep] = useState(0);
  const [showIngredients, setShowIngredients] = useState(false);
  const [checked, setChecked] = useState<Set<number>>(new Set());
  // Only rendered after a click, so navigator is always there.
  const [awake, setAwake] = useState<boolean | null>(() => ("wakeLock" in navigator ? null : false));

  // Open as a modal: focus moves in, the page behind is inert, Esc closes.
  // (No close() on cleanup: removing the element ends the modal, and a close
  // event here would call onClose during React's dev double-mount.)
  // Done and Finish call onClose directly; Esc closes the dialog natively, and
  // its close event tells the parent to unmount us.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (!dialog.open) dialog.showModal();
    const handleClose = () => onCloseRef.current();
    dialog.addEventListener("close", handleClose);
    return () => dialog.removeEventListener("close", handleClose);
  }, []);

  // Keep the screen on. The lock is dropped whenever the tab is hidden, so
  // take it again when the cook comes back.
  useEffect(() => {
    if (!("wakeLock" in navigator)) return;
    let lock: WakeLockSentinel | null = null;
    let cancelled = false;
    const request = async () => {
      try {
        lock = await navigator.wakeLock.request("screen");
        if (cancelled) lock.release();
        else setAwake(true);
      } catch {
        setAwake(false);
      }
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") request();
    };
    request();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
      lock?.release();
    };
  }, []);

  const last = steps.length - 1;
  const prev = () => setStep((s) => Math.max(0, s - 1));
  const next = () => setStep((s) => Math.min(last, s + 1));

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.target instanceof HTMLInputElement) return;
    if (e.key === "ArrowRight") next();
    if (e.key === "ArrowLeft") prev();
  }

  function toggle(i: number) {
    setChecked((current) => {
      const copy = new Set(current);
      if (copy.has(i)) copy.delete(i);
      else copy.add(i);
      return copy;
    });
  }

  return (
    <dialog
      ref={dialogRef}
      onKeyDown={onKeyDown}
      aria-label={`Cook mode: ${title}`}
      className="m-0 h-dvh max-h-none w-screen max-w-none bg-paper p-0 text-ink backdrop:bg-ink/60"
    >
      <div className="mx-auto flex h-full max-w-3xl flex-col px-4 py-4 sm:py-6">
        <div className="flex items-center justify-between gap-4">
          <p className="truncate font-display text-lg font-extrabold">{title}</p>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-full border border-stone-300 bg-white px-4 py-2 text-sm font-semibold hover:border-brand"
          >
            Done
          </button>
        </div>
        {awake !== null && (
          <p className="mt-1 text-xs text-stone-500">
            {awake ? "Your screen will stay on while cook mode is open." : "Your browser may dim the screen while you cook."}
          </p>
        )}

        <button
          type="button"
          onClick={() => setShowIngredients((v) => !v)}
          aria-expanded={showIngredients}
          className="mt-4 self-start text-sm font-semibold text-brand hover:underline"
        >
          {showIngredients ? "Hide ingredients" : `Show ingredients (${ingredients.length})`}
        </button>
        {showIngredients && (
          <ul className="mt-3 max-h-[40vh] space-y-2 overflow-y-auto rounded-lg border border-stone-200 bg-white p-4">
            {ingredients.map((text, i) => (
              <li key={i}>
                <label className="flex items-start gap-3 text-lg">
                  <input
                    type="checkbox"
                    checked={checked.has(i)}
                    onChange={() => toggle(i)}
                    className="mt-1.5 h-5 w-5 shrink-0 accent-brand"
                  />
                  <span className={checked.has(i) ? "text-stone-400 line-through" : ""}>{text}</span>
                </label>
              </li>
            ))}
          </ul>
        )}

        <div className="flex flex-1 flex-col justify-center py-6">
          {steps.length === 0 ? (
            <p className="text-xl text-stone-600">This recipe has no steps.</p>
          ) : (
            <>
              <p className="text-sm font-bold uppercase tracking-widest text-brand">
                Step {step + 1} of {steps.length}
              </p>
              <p aria-live="polite" className="mt-4 text-2xl leading-snug sm:text-4xl sm:leading-snug">
                {steps[step]}
              </p>
            </>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 pb-2">
          <button
            type="button"
            onClick={prev}
            disabled={step === 0}
            className="rounded-full border border-stone-300 bg-white py-4 text-lg font-semibold hover:border-brand disabled:opacity-40"
          >
            ← Back
          </button>
          {step < last ? (
            <button
              type="button"
              onClick={next}
              className="rounded-full bg-brand py-4 text-lg font-semibold text-white hover:bg-brand-dark"
            >
              Next →
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="rounded-full bg-ink py-4 text-lg font-semibold text-white hover:bg-stone-700"
            >
              Finish
            </button>
          )}
        </div>
      </div>
    </dialog>
  );
}
