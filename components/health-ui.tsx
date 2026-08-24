"use client";

/**
 * Aegis Health UI primitives — the design system for the app.
 * Everything consumes the semantic tokens from app/globals.css
 * (bg-surface, text-ink, border-line, …) so components stay on-palette.
 */

import { useEffect, useState, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from "react";
import { EXPLORER_URL } from "@/lib/stellar-config";
import { relativeTime, shortAddress, timeUntil } from "@/lib/format";
import type { ClaimStatus } from "@/lib/event-reducers";

export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

// ---------------------------------------------------------------------------
// Button
// ---------------------------------------------------------------------------

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "subtle";
type ButtonSize = "sm" | "md" | "lg";

const BUTTON_BASE =
  "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-55 select-none";

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-brand-600 text-white hover:bg-brand-700 active:bg-brand-800",
  secondary:
    "border border-line-strong bg-surface text-ink hover:border-brand-400 hover:text-brand-700",
  ghost: "text-ink-secondary hover:bg-surface-muted hover:text-ink",
  danger: "bg-danger text-white hover:brightness-95",
  subtle: "bg-brand-50 text-brand-700 hover:bg-brand-100",
};

const BUTTON_SIZES: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-[13px]",
  md: "h-10 px-4 text-sm",
  lg: "h-11 px-5 text-[15px]",
};

/** Class recipe for links that must look like buttons. */
export function buttonClass(
  variant: ButtonVariant = "primary",
  size: ButtonSize = "md",
  extra = "",
): string {
  return cn(BUTTON_BASE, BUTTON_VARIANTS[variant], BUTTON_SIZES[size], extra);
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  disabled,
  className,
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      className={buttonClass(variant, size, className ?? "")}
      disabled={disabled || loading}
      {...rest}
    >
      {loading && <Spinner />}
      {children}
    </button>
  );
}

export function Spinner({ className = "" }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "size-4 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent",
        className,
      )}
    />
  );
}

// ---------------------------------------------------------------------------
// Surfaces
// ---------------------------------------------------------------------------

export function Card({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-card border border-line bg-surface shadow-card",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  description,
  actions,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4 border-b border-line px-5 py-5">
      <div className="min-w-0">
        <h2 className="text-[15px] font-semibold text-ink-strong">{title}</h2>
        {description ? (
          <p className="mt-1 text-[13px] leading-5 text-ink-secondary">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {eyebrow ? (
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-600">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink-strong">
          {title}
        </h1>
        {description ? (
          <p className="mt-1 max-w-2xl text-sm text-ink-secondary">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </header>
  );
}

// ---------------------------------------------------------------------------
// Stat tiles (dataviz spec: label + semibold proportional value, text tokens)
// ---------------------------------------------------------------------------

export function StatCard({
  label,
  value,
  hint,
  accent = false,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  /** Brand-accented left rule for the lead stat of a view. */
  accent?: boolean;
}) {
  return (
    <Card
      className={cn(
        "px-5 py-4",
        accent && "border-brand-200 border-l-4 border-l-brand-500",
      )}
    >
      <p className="text-[13px] font-medium text-ink-secondary">{label}</p>
      <p className="mt-1 text-2xl font-semibold tracking-tight text-ink-strong">
        {value}
      </p>
      {hint ? <p className="mt-1 text-xs text-ink-muted">{hint}</p> : null}
    </Card>
  );
}

export function StatRow({ children }: { children: ReactNode }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Forms
// ---------------------------------------------------------------------------

export function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: ReactNode;
  error?: string | null;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[13px] font-medium text-ink">
        {label}
      </span>
      {children}
      {error ? (
        <span className="mt-1 block text-xs text-danger">{error}</span>
      ) : hint ? (
        <span className="mt-1 block text-xs text-ink-muted">{hint}</span>
      ) : null}
    </label>
  );
}

const CONTROL_CLASS =
  "w-full rounded-lg border border-line-strong bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-muted focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/25 disabled:bg-surface-muted disabled:text-ink-muted";

export function Input({
  className,
  ...rest
}: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(CONTROL_CLASS, "h-10", className)} {...rest} />;
}

export function Select({
  className,
  children,
  ...rest
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn(CONTROL_CLASS, "h-10 pr-8", className)} {...rest}>
      {children}
    </select>
  );
}

// ---------------------------------------------------------------------------
// Feedback states
// ---------------------------------------------------------------------------

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn("animate-pulse rounded-md bg-surface-muted", className)}
    />
  );
}

export function EmptyState({
  icon = "◇",
  title,
  body,
  action,
}: {
  icon?: ReactNode;
  title: string;
  body?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-12 text-center">
      <div
        aria-hidden
        className="flex size-10 items-center justify-center rounded-full bg-surface-muted text-lg text-brand-600"
      >
        {icon}
      </div>
      <p className="text-sm font-semibold text-ink-strong">{title}</p>
      {body ? (
        <p className="max-w-sm text-[13px] text-ink-secondary">{body}</p>
      ) : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}

export function ErrorState({
  title = "Something went wrong",
  message,
  onRetry,
}: {
  title?: string;
  message?: string | null;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-10 text-center">
      <p className="text-sm font-semibold text-danger">{title}</p>
      {message ? (
        <p className="max-w-md text-[13px] text-ink-secondary">{message}</p>
      ) : null}
      {onRetry ? (
        <Button variant="secondary" size="sm" onClick={onRetry} className="mt-2">
          Try again
        </Button>
      ) : null}
    </div>
  );
}

export function Banner({
  tone = "info",
  title,
  children,
}: {
  tone?: "info" | "success" | "warning" | "danger";
  title?: ReactNode;
  children?: ReactNode;
}) {
  const tones = {
    info: "border-info/30 bg-info-soft text-info",
    success: "border-success/30 bg-success-soft text-success",
    warning: "border-warning/30 bg-warning-soft text-warning",
    danger: "border-danger/30 bg-danger-soft text-danger",
  } as const;
  return (
    <div className={cn("rounded-lg border px-4 py-3 text-[13px]", tones[tone])}>
      {title ? <p className="font-semibold">{title}</p> : null}
      {children ? <div className={title ? "mt-0.5" : undefined}>{children}</div> : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Status + addresses
// ---------------------------------------------------------------------------

export type PillTone = "neutral" | "brand" | "success" | "warning" | "danger" | "info";

const PILL_TONES: Record<PillTone, string> = {
  neutral: "bg-surface-muted text-ink-secondary border-line",
  brand: "bg-brand-50 text-brand-700 border-brand-200",
  success: "bg-success-soft text-success border-success/25",
  warning: "bg-warning-soft text-warning border-warning/25",
  danger: "bg-danger-soft text-danger border-danger/25",
  info: "bg-info-soft text-info border-info/25",
};

export function StatusPill({
  tone = "neutral",
  children,
  pulse = false,
}: {
  tone?: PillTone;
  children: ReactNode;
  pulse?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide",
        PILL_TONES[tone],
      )}
    >
      <span
        aria-hidden
        className={cn(
          "size-1.5 rounded-full bg-current",
          pulse && tone !== "neutral" && "animate-pulse",
        )}
      />
      {children}
    </span>
  );
}

/** Claim lifecycle → pill tone (status colors reserved for state). */
export function claimStatusTone(status: ClaimStatus): PillTone {
  switch (status) {
    case "Pending":
      return "warning";
    case "Approved":
      return "info";
    case "Paid":
      return "success";
    case "Rejected":
      return "danger";
    case "Cancelled":
      return "neutral";
  }
}

export function AddressChip({
  address,
  head = 6,
  tail = 6,
  link = false,
}: {
  address: string;
  head?: number;
  tail?: number;
  link?: boolean;
}) {
  if (!address) return <span className="text-ink-muted">—</span>;
  const label = shortAddress(address, head, tail);
  return link ? (
    <a
      href={`${EXPLORER_URL}/account/${address}`}
      target="_blank"
      rel="noreferrer"
      className="font-mono text-[12.5px] text-ink-secondary underline decoration-line-strong underline-offset-2 hover:text-brand-700"
      title={address}
    >
      {label}
    </a>
  ) : (
    <span className="font-mono text-[12.5px] text-ink-secondary" title={address}>
      {label}
    </span>
  );
}

export function TxLink({ hash }: { hash: string }) {
  if (!hash) return null;
  return (
    <a
      href={`${EXPLORER_URL}/tx/${hash}`}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1 font-mono text-[12px] text-ink-muted hover:text-brand-700"
      title={`View transaction ${hash}`}
    >
      {shortAddress(hash, 4, 4)} ↗
    </a>
  );
}

export function CopyButton({
  value,
  label = "Copy",
}: {
  value: string;
  label?: string;
}) {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 1600);
    return () => clearTimeout(timer);
  }, [copied]);
  return (
    <button
      type="button"
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium transition-colors",
        copied
          ? "text-success"
          : "text-ink-muted hover:bg-surface-muted hover:text-ink",
      )}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
        } catch {
          /* clipboard unavailable */
        }
      }}
    >
      {copied ? "Copied" : label}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Time
// ---------------------------------------------------------------------------

export function ExpiryTimer({
  expiresAt,
  nowSec,
  className,
}: {
  expiresAt: number;
  nowSec: number;
  className?: string;
}) {
  const label = timeUntil(expiresAt, nowSec);
  const expired = expiresAt <= nowSec;
  const soon = !expired && expiresAt - nowSec < 86_400;
  return (
    <span
      className={cn(
        "text-xs font-medium",
        expired ? "text-ink-muted" : soon ? "text-warning" : "text-ink-secondary",
        className,
      )}
    >
      {expired ? "expired" : `expires ${label}`}
    </span>
  );
}

export function RelativeTime({
  epochSec,
  nowSec,
}: {
  epochSec: number;
  nowSec: number;
}) {
  if (!epochSec) return <span className="text-ink-muted">—</span>;
  return (
    <span className="whitespace-nowrap text-xs text-ink-muted">
      {relativeTime(epochSec, nowSec)}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Domain cards
// ---------------------------------------------------------------------------

export function RecordCard({
  id,
  provider,
  contentHash,
  createdAt,
  updatedAt,
  keyVersion,
  activeGrants = 0,
  nowSec,
  actions,
  onOpenGrants,
}: {
  id: string;
  provider: string;
  contentHash: string;
  createdAt: number;
  updatedAt: number;
  keyVersion: number;
  activeGrants?: number;
  nowSec: number;
  actions?: ReactNode;
  onOpenGrants?: () => void;
}) {
  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-mono text-sm font-semibold text-ink-strong">
              {shortAddress(id, 8, 8)}
            </h3>
            <CopyButton value={id} label="Copy id" />
          </div>
          <p className="mt-1 text-[13px] text-ink-secondary">
            Provider <AddressChip address={provider} link />
          </p>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <StatusPill tone={activeGrants > 0 ? "success" : "neutral"}>
            {activeGrants > 0
              ? `${activeGrants} active grant${activeGrants === 1 ? "" : "s"}`
              : "no active grants"}
          </StatusPill>
          {onOpenGrants ? (
            <Button variant="ghost" size="sm" onClick={onOpenGrants}>
              Manage access
            </Button>
          ) : null}
        </div>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-[13px] sm:grid-cols-4">
        <div>
          <dt className="text-ink-muted">Content hash</dt>
          <dd className="mt-0.5 truncate font-mono text-ink" title={contentHash}>
            {shortAddress(contentHash, 8, 6)}
          </dd>
        </div>
        <div>
          <dt className="text-ink-muted">Key version</dt>
          <dd className="mt-0.5 text-ink">v{keyVersion}</dd>
        </div>
        <div>
          <dt className="text-ink-muted">Registered</dt>
          <dd className="mt-0.5 text-ink">
            <RelativeTime epochSec={createdAt} nowSec={nowSec} />
          </dd>
        </div>
        <div>
          <dt className="text-ink-muted">Updated</dt>
          <dd className="mt-0.5 text-ink">
            <RelativeTime epochSec={updatedAt || createdAt} nowSec={nowSec} />
          </dd>
        </div>
      </dl>

      {actions ? <div className="mt-4 flex flex-wrap gap-2">{actions}</div> : null}
    </Card>
  );
}

export function AccessGrantRow({
  recordId,
  grantee,
  roleLabel,
  expiresAt,
  nowSec,
  actions,
}: {
  recordId: string;
  grantee: string;
  roleLabel?: string | null;
  expiresAt: number;
  nowSec: number;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <AddressChip address={grantee} link />
          {roleLabel ? <StatusPill tone="brand">{roleLabel}</StatusPill> : null}
        </div>
        <p className="mt-1 flex items-center gap-2 text-xs text-ink-muted">
          <span className="font-mono">{shortAddress(recordId, 6, 6)}</span>
          <ExpiryTimer expiresAt={expiresAt} nowSec={nowSec} />
        </p>
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function ClaimStepper({ status }: { status: ClaimStatus }) {
  const flow: ClaimStatus[] = ["Pending", "Approved", "Paid"];
  const terminalBad = status === "Rejected" || status === "Cancelled";
  const reached = flow.indexOf(status);

  if (terminalBad) {
    return (
      <div className="flex items-center gap-2">
        <StatusPill tone={status === "Rejected" ? "danger" : "neutral"}>
          {status}
        </StatusPill>
        <span className="text-xs text-ink-muted">
          {status === "Rejected" ? "by insurer" : "by patient"}
        </span>
      </div>
    );
  }

  return (
    <ol className="flex items-center gap-1.5" aria-label={`Claim status: ${status}`}>
      {flow.map((step, i) => {
        const done = i <= reached;
        return (
          <li key={step} className="flex items-center gap-1.5">
            <span
              className={cn(
                "flex size-5 items-center justify-center rounded-full text-[10px] font-bold",
                done ? "bg-brand-600 text-white" : "bg-surface-muted text-ink-muted",
              )}
              aria-current={i === reached ? "step" : undefined}
            >
              {done ? "✓" : i + 1}
            </span>
            <span
              className={cn(
                "text-[11px] font-medium",
                i === reached ? "text-ink-strong" : "text-ink-muted",
              )}
            >
              {step}
            </span>
            {i < flow.length - 1 ? (
              <span
                aria-hidden
                className={cn("h-px w-4", done ? "bg-brand-400" : "bg-line-strong")}
              />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

export function SecurityNote({ children }: { children: ReactNode }) {
  return (
    <div className="flex gap-3 rounded-card border border-line bg-surface-muted px-4 py-3.5">
      <span aria-hidden className="text-base leading-6">
        🛡️
      </span>
      <p className="text-[13px] leading-relaxed text-ink-secondary">{children}</p>
    </div>
  );
}

export function AuditLogEntry({
  name,
  description,
  actor,
  txHash,
  closedAt,
  nowSec,
}: {
  name: string;
  description: string;
  actor?: string;
  txHash: string;
  closedAt?: string;
  nowSec: number;
}) {
  const epoch = closedAt ? Math.floor(new Date(closedAt).getTime() / 1000) : 0;
  return (
    <div className="flex items-start justify-between gap-4 px-5 py-3">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <StatusPill tone="brand">{name.replace(/_/g, " ")}</StatusPill>
          <span className="text-[13px] text-ink">{description}</span>
        </div>
        {actor ? (
          <p className="mt-1 flex items-center gap-2 text-xs text-ink-muted">
            by <AddressChip address={actor} link />
          </p>
        ) : null}
      </div>
      <div className="flex shrink-0 flex-col items-end gap-0.5">
        <RelativeTime epochSec={epoch} nowSec={nowSec} />
        <TxLink hash={txHash} />
      </div>
    </div>
  );
}
