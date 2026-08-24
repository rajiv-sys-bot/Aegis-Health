"use client";

/**
 * Header wallet control: Connect → address chip with copy + disconnect.
 * Errors surface as toasts (never silently swallowed).
 */

import { useState } from "react";
import { useWallet } from "@/components/wallet-provider";
import { useToast } from "@/components/toast";
import {
  AddressChip,
  Button,
  CopyButton,
  StatusPill,
  cn,
} from "@/components/health-ui";

export function WalletConnectButton() {
  const { address, connecting, connect, disconnect } = useWallet();
  const toast = useToast();
  const [open, setOpen] = useState(false);

  if (!address) {
    return (
      <Button
        size="sm"
        loading={connecting}
        onClick={async () => {
          try {
            await connect();
            toast.push({ tone: "success", message: "Wallet connected." });
          } catch (e) {
            toast.push({
              tone: "error",
              message: e instanceof Error ? e.message : "Could not connect wallet.",
            });
          }
        }}
      >
        Connect wallet
      </Button>
    );
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label="Open active wallet menu"
        className="flex h-9 items-center gap-2 rounded-lg border border-brand-300 bg-brand-50 px-2.5 text-[12.5px] font-semibold text-brand-800 shadow-sm transition-colors hover:border-brand-500 hover:bg-brand-100"
      >
        <span
          aria-hidden
          className="size-2 rounded-full bg-success shadow-[0_0_0_3px_rgba(21,122,74,.14)]"
        />
        <span className="hidden text-[10px] font-bold uppercase tracking-[0.08em] text-brand-700 sm:inline">
          Active wallet
        </span>
        <AddressChip address={address} head={4} tail={4} />
        <span aria-hidden className="text-ink-muted">
          ▾
        </span>
      </button>

      {open ? (
        <>
          <button
            type="button"
            aria-label="Close wallet menu"
            className="fixed inset-0 z-30 cursor-default"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 z-40 mt-2 w-60 rounded-xl border border-line bg-surface p-2 shadow-pop">
            <div className="flex items-center justify-between px-2 py-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
                Account
              </span>
              <CopyButton value={address} />
            </div>
            <p className="break-all px-2 pb-2 font-mono text-[11px] leading-relaxed text-ink-secondary">
              {address}
            </p>
            <button
              type="button"
              onClick={() => {
                disconnect();
                setOpen(false);
                toast.push({ tone: "info", message: "Wallet disconnected." });
              }}
              className={cn(
                "w-full rounded-lg px-2.5 py-2 text-left text-[13px] font-medium text-danger",
                "hover:bg-danger-soft",
              )}
            >
              Disconnect
            </button>
          </div>
        </>
      ) : null}
    </div>
  );
}

/** Red chip shown in the header when the wallet is on the wrong network. */
export function NetworkWarningChip() {
  const { address, networkOk } = useWallet();
  if (!address || networkOk) return null;
  return (
    <StatusPill tone="danger" pulse>
      Wrong network — switch Freighter to Testnet
    </StatusPill>
  );
}
