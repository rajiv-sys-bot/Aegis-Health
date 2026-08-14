"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface AsyncState<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
  /** Re-run the loader (bumps an internal nonce). */
  reload: () => void;
}

/**
 * Minimal promise-state hook. `fn` may be an inline closure — it is kept in a
 * ref (synced from an effect) while `deps` decide when to re-run.
 *
 * `loading` means "no result yet": true on mount and after `reload()` until a
 * result lands. Once a result exists it stays false during background
 * refetches, so callers keep rendering stale content instead of flashing a
 * skeleton. State transitions only ever happen in async callbacks.
 */
export function useAsync<T>(
  fn: () => Promise<T>,
  deps: unknown[],
): AsyncState<T> {
  const [result, setResult] = useState<{
    data: T | null;
    error: string | null;
  }>({ data: null, error: null });
  const [nonce, setNonce] = useState(0);
  const fnRef = useRef(fn);

  // Latest closure without re-triggering the loader below — deps decide.
  useEffect(() => {
    fnRef.current = fn;
  });

  useEffect(() => {
    let cancelled = false;
    void fnRef
      .current()
      .then((value) => {
        if (!cancelled) setResult({ data: value, error: null });
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setResult({
            data: null,
            error: e instanceof Error ? e.message : String(e),
          });
        }
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, nonce]);

  const reload = useCallback(() => {
    setResult((prev) => ({ ...prev, error: null }));
    setNonce((n) => n + 1);
  }, []);

  return { ...result, loading: result.data === null && !result.error, reload };
}

/** Ticking epoch-seconds clock for expiry countdowns (default: 30s). */
export function useNow(intervalSec = 30): number {
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));
  useEffect(() => {
    const timer = setInterval(
      () => setNow(Math.floor(Date.now() / 1000)),
      intervalSec * 1000,
    );
    return () => clearInterval(timer);
  }, [intervalSec]);
  return now;
}
