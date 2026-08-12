"use client";

/**
 * Typed read layer over the contract's query functions, using a no-signer
 * client. Every view model is JSON-safe (hex strings, decimal strings,
 * numbers) so results can live in React state/props directly.
 *
 * `Result::Err` (NotFound etc.) maps to null — callers treat it as
 * "archived / not visible", never as a crash.
 */

import { Buffer } from "buffer";
import type {
  AssembledTransaction,
  Result,
} from "@stellar/stellar-sdk/contract";
import { anonymousClient } from "./stellar";
import { assertConfig } from "./stellar-config";
import { hex } from "./format";
import type { ClaimStatus } from "./event-reducers";

export interface RecordView {
  id: string;
  patient: string;
  provider: string;
  contentHash: string;
  locatorHash: string;
  createdAt: number;
  updatedAt: number;
  keyVersion: number;
}

export interface GrantView {
  patient: string;
  grantee: string;
  grantedAt: number;
  expiresAt: number;
  keyVersion: number;
  keyCommitment: string;
}

export interface ClaimView {
  claimId: string;
  patient: string;
  provider: string;
  insurer: string;
  recordId: string;
  token: string;
  /** i128 stroops as decimal string. */
  amount: string;
  evidenceHash: string;
  submittedAt: number;
  status: ClaimStatus;
}

export interface PolicyView {
  insurer: string;
  patient: string;
  token: string;
  maxPerClaim: string;
  validUntil: number;
  active: boolean;
}

// ---------------------------------------------------------------------------
// Plumbing
// ---------------------------------------------------------------------------

let clientSingleton: ReturnType<typeof anonymousClient> | null = null;

function client() {
  if (!clientSingleton) {
    assertConfig();
    clientSingleton = anonymousClient();
  }
  return clientSingleton;
}

/** Simulate a query and unwrap its Result — errors become null. */
async function unwrap<T>(
  call: () => Promise<AssembledTransaction<Result<T>>>,
): Promise<T | null> {
  try {
    const tx = await call();
    if (!tx.result) return null;
    // Result::Err (NotFound, Unauthorized, …) → "not visible", not a crash.
    if (tx.result.isErr()) return null;
    return tx.result.unwrap();
  } catch {
    return null;
  }
}

const bufToHex = (b: Buffer | Uint8Array | undefined): string =>
  b ? hex(Buffer.from(b)) : "";

const num = (v: unknown): number => {
  if (typeof v === "bigint") return Number(v);
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
};

/** Bounded-concurrency map for hydration batches (RPC rate limits). */
export async function mapLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, () =>
    (async () => {
      for (;;) {
        const index = next++;
        if (index >= items.length) return;
        results[index] = await fn(items[index], index);
      }
    })(),
  );
  await Promise.all(workers);
  return results;
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export async function getRecord(recordIdHex: string): Promise<RecordView | null> {
  const record = await unwrap(() =>
    client().get_record({ record_id: Buffer.from(recordIdHex, "hex") }),
  );
  if (!record) return null;
  return {
    id: recordIdHex,
    patient: record.patient,
    provider: record.provider,
    contentHash: bufToHex(record.content_hash),
    locatorHash: bufToHex(record.locator_hash),
    createdAt: num(record.created_at),
    updatedAt: num(record.updated_at),
    keyVersion: num(record.key_version),
  };
}

export async function getGrant(
  recordIdHex: string,
  grantee: string,
): Promise<GrantView | null> {
  const grant = await unwrap(() =>
    client().get_grant({
      record_id: Buffer.from(recordIdHex, "hex"),
      grantee,
    }),
  );
  if (!grant) return null;
  return {
    patient: grant.patient,
    grantee: grant.grantee,
    grantedAt: num(grant.granted_at),
    expiresAt: num(grant.expires_at),
    keyVersion: num(grant.key_version),
    keyCommitment: bufToHex(grant.key_commitment),
  };
}

/** Live on-chain check — expiry enforced by the contract itself. */
export async function hasAccess(
  recordIdHex: string,
  grantee: string,
): Promise<boolean> {
  try {
    const tx = await client().has_access({
      record_id: Buffer.from(recordIdHex, "hex"),
      grantee,
    });
    return tx.result === true;
  } catch {
    return false;
  }
}

export async function getClaim(claimIdHex: string): Promise<ClaimView | null> {
  const claim = await unwrap(() =>
    client().get_claim({ claim_id: Buffer.from(claimIdHex, "hex") }),
  );
  if (!claim) return null;
  return {
    claimId: claimIdHex,
    patient: claim.patient,
    provider: claim.provider,
    insurer: claim.insurer,
    recordId: bufToHex(claim.record_id),
    token: claim.token,
    amount: claim.amount.toString(),
    evidenceHash: bufToHex(claim.evidence_hash),
    submittedAt: num(claim.submitted_at),
    status: claim.status.tag,
  };
}

export async function getPolicy(
  insurer: string,
  patient: string,
): Promise<PolicyView | null> {
  const policy = await unwrap(() => client().get_policy({ insurer, patient }));
  if (!policy) return null;
  return {
    insurer: policy.insurer,
    patient: policy.patient,
    token: policy.token,
    maxPerClaim: policy.max_per_claim.toString(),
    validUntil: num(policy.valid_until),
    active: policy.active === true,
  };
}

/** "Provider" | "Insurer" | null (unset). */
export async function roleOf(account: string): Promise<string | null> {
  try {
    const tx = await client().role_of({ account });
    const role = tx.result as { tag: string } | undefined | null;
    return role ? role.tag : null;
  } catch {
    return null;
  }
}

export async function contractAdmin(): Promise<string | null> {
  return unwrap(() => client().admin());
}
