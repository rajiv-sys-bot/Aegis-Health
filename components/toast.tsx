"use client";

/**
 * Global toast system. Pages call `useToast().push({ tone, message, txHash })`
 * instead of wiring per-page toasts. Success/info auto-dismiss; errors stay
 * until dismissed so failures are never missed mid-flow.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { EXPLORER_URL } from "@/lib/stellar-config";
import { shortAddress } from "@/lib/format";

export type ToastTone = "success" | "error" | "info" | "pending";

export interface ToastInput {
  tone: ToastTone;
  message: string;
  /** On-chain tx hash → explorer link inside the toast. */
  txHash?: string;
  /** Replace an existing pending toast (e.g. pending → success). */
  id?: string;
}

interface ToastItem extends ToastInput {
  id: string;
}

interface ToastApi {
  push: (toast: ToastInput) => string;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

const AUTO_DISMISS_MS: Partial<Record<ToastTone, number>> = {
  success: 6_000,
  info: 6_000,
};

const TONE_STYLES: Record<ToastTone, { border: string; icon: string }> = {
  success: { border: "border-success/35", icon: "✓" },
  error: { border: "border-danger/40", icon: "!" },
  info: { border: "border-info/35", icon: "i" },
  pending: { border: "border-brand-300", icon: "…" },
};

const TONE_ICON_CLASS: Record<ToastTone, string> = {
  success: "bg-success text-white",
  error: "bg-danger text-white",
  info: "bg-info text-white",
  pending: "bg-brand-600 text-white",
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const counter = useRef(0);
  // Keep latest list for stable timer callbacks without re-subscribing.
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  const dismiss = useCallback((id: string) => {
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
    setToasts((list) => list.filter((t) => t.id !== id));
  }, []);

  const schedule = useCallback(
    (id: string, tone: ToastTone) => {
      const ms = AUTO_DISMISS_MS[tone];
      if (!ms) return;
      const timer = setTimeout(() => dismiss(id), ms);
      timers.current.set(id, timer);
    },
    [dismiss],
  );

  const push = useCallback(
    (toast: ToastInput) => {
      counter.current += 1;
      const id = toast.id ?? `toast-${counter.current}`;
      setToasts((list) => {
        const rest = list.filter(
          (t) => t.id !== id && !(toast.id && t.id === toast.id),
        );
        return [...rest.slice(-3), { ...toast, id }];
      });
      schedule(id, toast.tone);
      return id;
    },
    [schedule],
  );

  useEffect(() => {
    const map = timers.current;
    return () => map.forEach((timer) => clearTimeout(timer));
  }, []);

  const api = useMemo(() => ({ push, dismiss }), [push, dismiss]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-20 z-[60] flex flex-col items-center gap-2 px-4 sm:bottom-6 sm:right-6 sm:left-auto sm:items-end"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border bg-surface px-4 py-3 shadow-pop ${
              TONE_STYLES[toast.tone].border
            }`}
            role="status"
          >
            <span
              aria-hidden
              className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${TONE_ICON_CLASS[toast.tone]}`}
            >
              {TONE_STYLES[toast.tone].icon}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-medium leading-snug text-ink">
                {toast.message}
              </p>
              {toast.txHash ? (
                <a
                  href={`${EXPLORER_URL}/tx/${toast.txHash}`}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 inline-block font-mono text-[11px] text-ink-muted hover:text-brand-700"
                >
                  {shortAddress(toast.txHash, 8, 8)} ↗ view on explorer
                </a>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => dismiss(toast.id)}
              aria-label="Dismiss notification"
              className="shrink-0 rounded p-1 text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

/** Access the global toast queue. Throws outside <ToastProvider>. */
export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within <ToastProvider>");
  return ctx;
}
