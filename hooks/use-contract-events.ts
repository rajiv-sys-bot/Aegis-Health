"use client";

import { useCallback, useEffect, useState } from "react";
import {
  clearEventCache,
  fetchContractEvents,
  type DecodedEvent,
} from "@/lib/events";

export interface ContractEventsState {
  events: DecodedEvent[];
  loading: boolean;
  error: string | null;
  /** Oldest retained ledger close time — event-history watermark. */
  watermarkIso: string;
  refresh: () => void;
}

const POLL_MS = 45_000;

/**
 * Subscribe to contract events for a set of topic patterns (from
 * lib/events.ts filter builders). Polls every 45s while the tab is visible,
 * refetches immediately on tab focus, and keeps the last good data on errors.
 *
 * Pass `null` to disable (e.g. wallet not connected).
 */
export function useContractEvents(
  patterns: string[][] | null,
): ContractEventsState {
  // Stable string key for effect deps + single-flight cache identity.
  const key = patterns ? JSON.stringify(patterns) : "";
  const [events, setEvents] = useState<DecodedEvent[]>([]);
  const [watermarkIso, setWatermarkIso] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    if (!key) return;
    const parsed: string[][] = JSON.parse(key);
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      try {
        const result = await fetchContractEvents(parsed);
        if (cancelled) return;
        setEvents(result.events);
        setWatermarkIso(result.watermarkIso);
        setError(null);
      } catch (e) {
        if (!cancelled) {
          setError(
            e instanceof Error
              ? e.message
              : "Could not load contract events.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void run();
    const timer = setInterval(() => {
      if (!document.hidden) void run();
    }, POLL_MS);
    const onVisibility = () => {
      if (!document.hidden) void run();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      cancelled = true;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [key, nonce]);

  const refresh = useCallback(() => {
    clearEventCache();
    setNonce((n) => n + 1);
  }, []);
  return { events, loading, error, watermarkIso, refresh };
}
