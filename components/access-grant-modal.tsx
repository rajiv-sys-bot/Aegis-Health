"use client";

/**
 * Grant-access modal — the consent flow.
 *
 * Context comes entirely from props (record id + display title + optional
 * prefilled grantee); a fresh random key commitment is generated per open via
 * crypto.getRandomValues, mirroring the contract model: the record's
 * encryption-key envelope is delivered off-chain and its SHA-256 commitment
 * is anchored on-chain with the grant.
 */

import { useEffect, useMemo, useState } from "react";
import { useWallet } from "@/components/wallet-provider";
import { useToast } from "@/components/toast";
import {
  Banner,
  Button,
  Field,
  Input,
  Select,
  cn,
} from "@/components/health-ui";
import { hexToBuffer, runWrite } from "@/lib/stellar";
import { shortAddress } from "@/lib/format";

const DAY = 86_400;

const EXPIRY_OPTIONS = [
  { value: "1", label: "24 hours" },
  { value: "7", label: "7 days" },
  { value: "30", label: "30 days" },
] as const;

export interface AccessGrantModalProps {
  open: boolean;
  onClose: () => void;
  /** bytes32 hex of the record to share. */
  recordIdHex: string;
  /** Human title shown in the header (falls back to a shortened id). */
  title?: string;
  /** Prefill the grantee (e.g. re-grant after revoke). */
  grantee?: string;
  onGranted?: () => void;
}

function randomCommitment(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function AccessGrantModal({
  open,
  onClose,
  recordIdHex,
  title,
  grantee: initialGrantee = "",
  onGranted,
}: AccessGrantModalProps) {
  const { address, connect, connecting: walletConnecting } = useWallet();
  const toast = useToast();

  const [grantee, setGrantee] = useState(initialGrantee);
  const [days, setDays] = useState("7");
  const [commitment, setCommitment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Fresh commitment every time the modal opens — never reused across grants.
  // Handled during render (React's "adjust state when a prop changes"
  // pattern) instead of in an effect, which would cascade an extra render.
  const [renderedOpen, setRenderedOpen] = useState(open);
  if (open !== renderedOpen) {
    setRenderedOpen(open);
    if (open) {
      setCommitment(randomCommitment());
      setGrantee(initialGrantee);
    }
  }

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const heading = useMemo(
    () =>
      title ??
      `Record ${shortAddress(recordIdHex || "", 6, 6)}`,
    [title, recordIdHex],
  );

  if (!open) return null;

  const submit = async () => {
    if (!address) return;
    setFormError(null);

    if (!/^G[A-Z2-7]{55}$/.test(grantee.trim().toUpperCase())) {
      setFormError("Enter a valid Stellar account address (G…).");
      return;
    }
    const normalizedGrantee = grantee.trim().toUpperCase();

    let expiresAt: bigint;
    try {
      expiresAt = BigInt(Math.floor(Date.now() / 1000) + Number(days) * DAY);
    } catch {
      setFormError("Invalid expiry.");
      return;
    }

    setSubmitting(true);
    try {
      const { hash } = await runWrite(address, (client) =>
        client.grant_access({
          patient: address,
          record_id: hexToBuffer(recordIdHex),
          grantee: normalizedGrantee,
          expires_at: expiresAt,
          key_commitment: hexToBuffer(commitment),
        }),
      );
      toast.push({
        tone: "success",
        message: `Access granted to ${shortAddress(normalizedGrantee)}.`,
        txHash: hash,
      });
      onGranted?.();
      onClose();
    } catch (e) {
      const message =
        e instanceof Error ? e.message : "The grant transaction failed.";
      setFormError(message);
      toast.push({ tone: "error", message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button
        type="button"
        aria-label="Close dialog"
        className="absolute inset-0 cursor-default bg-brand-900/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Grant access to a medical record"
        className="relative z-10 w-full max-w-lg rounded-t-2xl border border-line bg-surface p-6 shadow-pop sm:rounded-2xl"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-600">
              Consent control
            </p>
            <h2 className="mt-1 text-lg font-semibold text-ink-strong">
              Grant access · {heading}
            </h2>
            <p className="mt-1 font-mono text-xs text-ink-muted">
              {shortAddress(recordIdHex, 10, 8)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1.5 text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink"
          >
            ✕
          </button>
        </div>

        {!address ? (
          <div className="space-y-4">
            <Banner tone="info" title="Connect your wallet first">
              Only the record owner&apos;s wallet can sign this consent grant.
            </Banner>
            <Button
              className="w-full"
              loading={walletConnecting}
              onClick={async () => {
                try {
                  await connect();
                } catch (e) {
                  toast.push({
                    tone: "error",
                    message:
                      e instanceof Error ? e.message : "Could not connect wallet.",
                  });
                }
              }}
            >
              Connect wallet
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <Field label="Share with" hint="Stellar account (G…) of the provider or insurer.">
              <Input
                value={grantee}
                onChange={(e) => setGrantee(e.target.value)}
                placeholder="GABC…"
                spellCheck={false}
                autoComplete="off"
                className="font-mono text-[13px]"
              />
            </Field>

            <Field
              label="Access expires after"
              hint="The contract enforces expiry automatically; you can revoke earlier at any time."
            >
              <Select value={days} onChange={(e) => setDays(e.target.value)}>
                {EXPIRY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </Field>

            <Field
              label="Key commitment"
              hint="SHA-256 commitment to the encrypted key envelope delivered off-chain."
            >
              <div className="flex items-center gap-2 rounded-lg border border-line bg-surface-muted px-3 py-2">
                <code className="min-w-0 flex-1 truncate font-mono text-[12px] text-ink-secondary">
                  {shortAddress(commitment, 18, 12)}
                </code>
                <span className="shrink-0 text-[11px] font-medium text-success">
                  fresh
                </span>
              </div>
            </Field>

            {formError ? (
              <Banner tone="danger">{formError}</Banner>
            ) : null}

            <div className={cn("flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end")}>
              <Button variant="ghost" onClick={onClose} disabled={submitting}>
                Cancel
              </Button>
              <Button onClick={submit} loading={submitting}>
                Sign &amp; grant access
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
