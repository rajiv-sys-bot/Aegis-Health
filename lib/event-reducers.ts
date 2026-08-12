/**
 * Pure reducers over decoded contract events → dashboard view models.
 *
 * No network, no React, no clocks of its own (`nowSec` is always a parameter)
 * so every function here is directly unit-testable and deterministic.
 */

import type { DecodedEvent } from "./events";

/** Process oldest→newest so later state transitions win. */
function chronological(events: DecodedEvent[]): DecodedEvent[] {
  return [...events].reverse();
}

// ---------------------------------------------------------------------------
// Records
// ---------------------------------------------------------------------------

/**
 * Record ids the account registered (patient topic slot), newest first.
 * Includes rotated records — rotation keeps the id stable.
 */
export function collectRecordIds(
  events: DecodedEvent[],
  owner?: string,
): string[] {
  const ids: string[] = [];
  const seen = new Set<string>();
  for (const e of chronological(events)) {
    if (e.name !== "record_registered" && e.name !== "record_rotated") continue;
    if (owner && e.accounts[0] !== owner) continue;
    const id = e.recordIds[0];
    if (!id || seen.has(id)) continue;
    seen.add(id);
    ids.push(id);
  }
  return ids;
}

/** Record ids where `provider` was the registering provider (event DATA). */
export function recordsProvidedBy(
  events: DecodedEvent[],
  provider: string,
): string[] {
  return collectRecordIds(events).filter((id) => {
    const registration = [...events]
      .reverse()
      .find((e) => e.name === "record_registered" && e.recordIds[0] === id);
    return registration?.fields.provider === provider;
  });
}

// ---------------------------------------------------------------------------
// Access grants
// ---------------------------------------------------------------------------

export interface GrantState {
  recordId: string;
  patient: string;
  grantee: string;
  /** Epoch seconds. */
  expiresAt: number;
  keyVersion: number;
  grantedAtLedger: number;
  grantedAtIso: string;
  txHash: string;
}

/**
 * Live grants: access_granted minus access_revoked minus expired, keyed by
 * recordId+grantee. Later events win over earlier ones.
 */
export function currentGrants(
  events: DecodedEvent[],
  nowSec: number,
): GrantState[] {
  const live = new Map<string, GrantState>();
  for (const e of chronological(events)) {
    if (e.name === "access_granted") {
      const [patient, grantee] = e.accounts;
      const recordId = e.recordIds[0];
      if (!patient || !grantee || !recordId) continue;
      live.set(`${recordId}:${grantee}`, {
        recordId,
        patient,
        grantee,
        expiresAt: Number(e.fields.expires_at ?? 0),
        keyVersion: Number(e.fields.key_version ?? 0),
        grantedAtLedger: e.ledger,
        grantedAtIso: e.closedAt,
        txHash: e.txHash,
      });
    } else if (e.name === "access_revoked") {
      const [, grantee] = e.accounts;
      const recordId = e.recordIds[0];
      if (recordId && grantee) live.delete(`${recordId}:${grantee}`);
    }
  }
  return [...live.values()]
    .filter((g) => g.expiresAt > nowSec)
    .sort((a, b) => b.grantedAtLedger - a.grantedAtLedger);
}

// ---------------------------------------------------------------------------
// Claims
// ---------------------------------------------------------------------------

export type ClaimStatus =
  | "Pending"
  | "Approved"
  | "Rejected"
  | "Cancelled"
  | "Paid";

export interface ClaimLifecycle {
  claimId: string;
  patient: string;
  insurer: string;
  provider: string;
  /** i128 stroops as decimal string. */
  amount: string;
  /** Set once paid — SAC contract id. */
  token: string;
  status: ClaimStatus;
  updatedLedger: number;
  updatedIso: string;
  txHash: string;
}

/**
 * Fold submit/approve/reject/cancel/pay into one row per claim. Status is the
 * LAST transition in chain order; amounts update on approve/pay.
 */
export function claimLifecycles(events: DecodedEvent[]): ClaimLifecycle[] {
  const claims = new Map<string, ClaimLifecycle>();

  const apply = (e: DecodedEvent, patch: Partial<ClaimLifecycle>) => {
    const claimId = e.recordIds[0];
    if (!claimId) return;
    const existing = claims.get(claimId);
    claims.set(claimId, {
      ...existing,
      ...patch,
      claimId,
      updatedLedger: e.ledger,
      updatedIso: e.closedAt,
      txHash: e.txHash,
    } as ClaimLifecycle);
  };

  for (const e of chronological(events)) {
    switch (e.name) {
      case "claim_submitted":
        apply(e, {
          patient: e.accounts[0],
          insurer: e.accounts[1],
          provider: e.fields.provider ?? "",
          amount: e.fields.amount ?? "0",
          token: "",
          status: "Pending",
        });
        break;
      case "claim_approved":
        apply(e, { insurer: e.accounts[0], amount: e.fields.amount ?? "", status: "Approved" });
        break;
      case "claim_rejected":
        apply(e, { insurer: e.accounts[0], status: "Rejected" });
        break;
      case "claim_cancelled":
        apply(e, { patient: e.accounts[0], status: "Cancelled" });
        break;
      case "claim_paid":
        apply(e, {
          insurer: e.accounts[0],
          provider: e.accounts[1],
          token: e.fields.token ?? "",
          amount: e.fields.amount ?? "",
          status: "Paid",
        });
        break;
      default:
        break;
    }
  }

  return [...claims.values()].sort((a, b) => b.updatedLedger - a.updatedLedger);
}

// ---------------------------------------------------------------------------
// Access requests
// ---------------------------------------------------------------------------

export interface AccessRequest {
  requester: string;
  recordId: string;
  /** Epoch seconds the requester asked until. */
  requestedUntil: number;
  eventId: string;
  ledger: number;
  closedAt: string;
  txHash: string;
}

/** access_requested events, newest first. */
export function sentRequests(events: DecodedEvent[]): AccessRequest[] {
  return events
    .filter((e) => e.name === "access_requested")
    .map((e) => ({
      requester: e.actor,
      recordId: e.recordIds[0] ?? "",
      requestedUntil: Number(e.fields.requested_until ?? 0),
      eventId: e.id,
      ledger: e.ledger,
      closedAt: e.closedAt,
      txHash: e.txHash,
    }));
}

/** Requests targeting any of `recordIds` (a patient's inbound queue). */
export function requestsForRecords(
  events: DecodedEvent[],
  recordIds: Iterable<string>,
): AccessRequest[] {
  const wanted = new Set(recordIds);
  return sentRequests(events).filter((r) => wanted.has(r.recordId));
}

// ---------------------------------------------------------------------------
// Roles (admin page)
// ---------------------------------------------------------------------------

export interface RoleAssignment {
  account: string;
  role: string;
  enabled: boolean;
  eventId: string;
  ledger: number;
  closedAt: string;
}

/** Latest role_changed per account, most recent first. */
export function knownRoles(events: DecodedEvent[]): RoleAssignment[] {
  const roles = new Map<string, RoleAssignment>();
  for (const e of chronological(events)) {
    if (e.name !== "role_changed") continue;
    const account = e.actor;
    if (!account) continue;
    roles.set(account, {
      account,
      role: e.fields.role ?? "",
      enabled: e.fields.enabled === "true",
      eventId: e.id,
      ledger: e.ledger,
      closedAt: e.closedAt,
    });
  }
  return [...roles.values()].sort((a, b) => b.ledger - a.ledger);
}

// ---------------------------------------------------------------------------
// Activity feed
// ---------------------------------------------------------------------------

/** Human-readable line for an event (audit feed / dashboards). */
export function describeActivity(e: DecodedEvent): string {
  switch (e.name) {
    case "initialized":
      return "Contract initialized";
    case "admin_transferred":
      return "Admin transferred";
    case "role_changed": {
      const role = e.fields.role ?? "role";
      return e.fields.enabled === "true"
        ? `${role} role granted`
        : `${role} role revoked`;
    }
    case "record_registered":
      return "Medical record registered";
    case "record_rotated":
      return "Record keys rotated";
    case "access_requested":
      return "Access requested";
    case "access_granted":
      return "Access granted";
    case "access_revoked":
      return "Access revoked";
    case "policy_set":
      return "Insurance policy updated";
    case "claim_submitted":
      return "Claim submitted";
    case "claim_approved":
      return "Claim approved";
    case "claim_rejected":
      return "Claim rejected";
    case "claim_cancelled":
      return "Claim cancelled";
    case "claim_paid":
      return "Claim paid out";
    default:
      return e.name.replace(/_/g, " ");
  }
}
