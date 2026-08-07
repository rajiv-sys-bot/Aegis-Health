"use client";

/**
 * Freighter wallet context.
 *
 * - Restores the last-connected address instantly from localStorage, then
 *   confirms with the extension.
 * - Polls with WatchWalletChanges (the only change-detection API in
 *   freighter-api 6) so account switches / lock / network flips show up
 *   without a page reload.
 * - connect() stores AND rethrows errors — callers decide how to surface them.
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
import {
  getAddress,
  getNetwork,
  isConnected,
  requestAccess,
  setAllowed,
  WatchWalletChanges,
} from "@stellar/freighter-api";

const STORAGE_KEY = "aegis-health-wallet";
const WATCH_INTERVAL_MS = 4_000;

export interface WalletContextValue {
  address: string | null;
  connecting: boolean;
  error: string | null;
  /** Wallet reports TESTNET (the only network this app talks to). */
  networkOk: boolean;
  /** Extension detected at least once this session. */
  hasFreighter: boolean;
  connect: () => Promise<string>;
  disconnect: () => void;
}

const WalletContext = createContext<WalletContextValue | null>(null);

function describeError(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "string" && error) return error;
  return "Wallet request failed.";
}

export function WalletProvider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [networkOk, setNetworkOk] = useState(true);
  const [hasFreighter, setHasFreighter] = useState(true);
  // Ref mirror lets the watcher callback close over latest state safely.
  const addressRef = useRef<string | null>(null);

  const applyAddress = useCallback((next: string | null) => {
    addressRef.current = next;
    setAddress(next);
    if (next) {
      try {
        localStorage.setItem(STORAGE_KEY, next);
      } catch {
        /* private mode */
      }
    } else {
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {
        /* ignore */
      }
    }
  }, []);

  const checkNetwork = useCallback(async () => {
    try {
      const { network } = await getNetwork();
      setNetworkOk(network === "TESTNET");
    } catch {
      /* locked wallet — leave last known value */
    }
  }, []);

  // Restore session + start watching for changes.
  useEffect(() => {
    let disposed = false;

    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      // Applied in a microtask: restoring persisted state synchronously here
      // would cascade an extra render before hydration settles.
      if (saved) {
        queueMicrotask(() => {
          if (!disposed) applyAddress(saved);
        });
      }
    } catch {
      /* ignore */
    }

    void (async () => {
      try {
        const connected = await isConnected();
        if (disposed) return;
        setHasFreighter(connected.isConnected);
        if (!connected.isConnected) return;
        const { address: live } = await getAddress();
        if (disposed || !live) return;
        applyAddress(live);
        void checkNetwork();
      } catch {
        /* extension unreachable — keep restored value */
      }
    })();

    const watcher = new WatchWalletChanges(WATCH_INTERVAL_MS);
    watcher.watch((result: { address?: string; network?: string }) => {
      if (disposed) return;
      if (result.address && result.address !== addressRef.current) {
        applyAddress(result.address);
      } else if (!result.address && addressRef.current) {
        // Locked / disconnected in the extension.
        applyAddress(null);
      }
      if (result.network) setNetworkOk(result.network === "TESTNET");
    });

    return () => {
      disposed = true;
      watcher.stop();
    };
  }, [applyAddress, checkNetwork]);

  const connect = useCallback(async (): Promise<string> => {
    setConnecting(true);
    setError(null);
    try {
      const connected = await isConnected();
      setHasFreighter(connected.isConnected);
      if (!connected.isConnected) {
        throw new Error(
          "Freighter is not installed. Get it at freighter.app, then retry.",
        );
      }
      const access = await requestAccess();
      if (!access.address) throw new Error("No account was shared by Freighter.");
      applyAddress(access.address);
      // Grants future txs without re-prompting every signature.
      try {
        await setAllowed();
      } catch {
        /* optional — older extensions */
      }
      await checkNetwork();
      return access.address;
    } catch (e) {
      const message = describeError(e);
      setError(message);
      throw new Error(message);
    } finally {
      setConnecting(false);
    }
  }, [applyAddress, checkNetwork]);

  const disconnect = useCallback(() => {
    applyAddress(null);
    setError(null);
    setNetworkOk(true);
  }, [applyAddress]);

  const value = useMemo<WalletContextValue>(
    () => ({
      address,
      connecting,
      error,
      networkOk,
      hasFreighter,
      connect,
      disconnect,
    }),
    [address, connecting, error, networkOk, hasFreighter, connect, disconnect],
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet(): WalletContextValue {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used within <WalletProvider>");
  return ctx;
}
