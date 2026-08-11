/**
 * Client-side event indexer.
 *
 * The contract stores no enumeration indexes, but every event carries the
 * involved addresses as TOPICS, so Soroban RPC `getEvents` topic filters give
 * us per-role dashboards with zero backend. Raw rows are decoded here into
 * JSON-safe view models (hex strings, decimal strings) that React can hold in
 * state safely.
 */

import { Address, rpc, scValToNative, xdr } from "@stellar/stellar-sdk";
import { CONTRACT_ID, RPC_URL, assertConfig } from "./stellar-config";

// ---------------------------------------------------------------------------
// Topic encoding — getEvents takes patterns as arrays of base64 ScVal
// segments ("*" = wildcard); the SDK forwards them to JSON-RPC verbatim.
// ---------------------------------------------------------------------------

/** Symbol ScVal base64 — matches topic[0], the event name. */
export function topicSymbol(name: string): string {
  return xdr.ScVal.scvSymbol(name).toXDR("base64");
}

/** Address ScVal base64 — matches address-typed topics. */
export function topicAddress(account: string): string {
  return new Address(account).toScVal().toXDR("base64");
}

/** One topic pattern: pre-encoded ScVal segments, "*" wildcards allowed. */
export function topicPattern(...segments: string[]): string[] {
  return segments;
}

export type EventFilterSpec = {
  type: "contract";
  contractIds: string[];
  /** Each entry is one topic pattern (list of segments). */
  topics: string[][];
};

/** Build ≤5-pattern-per-request filters for our contract. */
export function contractFilters(patterns: string[][]): EventFilterSpec[] {
  assertConfig();
  if (patterns.length === 0) {
    // Empty topics = every event emitted by this contract.
    return [{ type: "contract", contractIds: [CONTRACT_ID], topics: [] }];
  }
  const specs: EventFilterSpec[] = [];
  for (let i = 0; i < patterns.length; i += 5) {
    specs.push({
      type: "contract",
      contractIds: [CONTRACT_ID],
      topics: patterns.slice(i, i + 5),
    });
  }
  return specs;
}

// ---------------------------------------------------------------------------
// Per-role filter sets. All patterns the role needs; chunked automatically.
// ---------------------------------------------------------------------------

export function patientFilters(patient: string): string[][] {
  const p = topicAddress(patient);
  return [
    topicPattern(topicSymbol("record_registered"), p, "*"),
    topicPattern(topicSymbol("record_rotated"), p, "*"),
    // access_requested topics are [requester, record_id] — the patient isn't
    // a topic, so scan requests and match record ids client-side.
    topicPattern(topicSymbol("access_requested"), "*", "*"),
    topicPattern(topicSymbol("access_granted"), p, "*", "*"),
    topicPattern(topicSymbol("access_revoked"), p, "*", "*"),
    topicPattern(topicSymbol("claim_submitted"), p, "*", "*"),
    topicPattern(topicSymbol("claim_cancelled"), p, "*"),
    topicPattern(topicSymbol("policy_set"), "*", p),
  ];
}

export function providerFilters(provider: string): string[][] {
  const d = topicAddress(provider);
  return [
    topicPattern(topicSymbol("access_requested"), d, "*"),
    topicPattern(topicSymbol("access_granted"), "*", d, "*"),
    topicPattern(topicSymbol("access_revoked"), "*", d, "*"),
    // provider lives in the event DATA, not topics — scan registrations.
    topicPattern(topicSymbol("record_registered"), "*", "*"),
  ];
}

export function insurerFilters(insurer: string): string[][] {
  const i = topicAddress(insurer);
  return [
    topicPattern(topicSymbol("claim_submitted"), "*", i, "*"),
    topicPattern(topicSymbol("claim_approved"), i, "*"),
    topicPattern(topicSymbol("claim_rejected"), i, "*"),
    topicPattern(topicSymbol("claim_paid"), i, "*", "*"),
    topicPattern(topicSymbol("policy_set"), i, "*"),
  ];
}

export function adminFilters(): string[][] {
  return [
    topicPattern(topicSymbol("role_changed"), "*"),
    topicPattern(topicSymbol("initialized"), "*"),
    topicPattern(topicSymbol("admin_transferred"), "*", "*"),
  ];
}

/** Every event from the contract (audit trail). */
export const auditFilters = (): string[][] => [];

// ---------------------------------------------------------------------------
// Decoding — scValToNative over topics + the Vec-valued `value` payload,
// mapped positionally per contract/src/events.rs.
// ---------------------------------------------------------------------------

type FieldKind = "address" | "bytes32" | "uint" | "int" | "bool" | "role";

type FieldSpec = { name: string; kind: FieldKind };

type EventSchema = {
  /** Topic slots after the event-name symbol, in order. */
  topics: FieldKind[];
  /** Non-topic params inside `value`, in declaration order. */
  fields: FieldSpec[];
};

const B = (name: string): FieldSpec => ({ name, kind: "bytes32" });
const A = (name: string): FieldSpec => ({ name, kind: "address" });
const U = (name: string): FieldSpec => ({ name, kind: "uint" });
const I = (name: string): FieldSpec => ({ name, kind: "int" });

/**
 * Exact mirror of contract/src/events.rs — topic[0] is always the name symbol.
 */
export const EVENT_SCHEMAS: Record<string, EventSchema> = {
  initialized: { topics: ["address"], fields: [] },
  admin_transferred: { topics: ["address", "address"], fields: [] },
  role_changed: {
    topics: ["address"],
    fields: [
      { name: "role", kind: "role" },
      { name: "enabled", kind: "bool" },
    ],
  },
  record_registered: {
    topics: ["address", "bytes32"],
    fields: [A("provider"), B("content_hash")],
  },
  record_rotated: {
    topics: ["address", "bytes32"],
    fields: [U("key_version")],
  },
  access_requested: {
    topics: ["address", "bytes32"],
    fields: [U("requested_until")],
  },
  access_granted: {
    topics: ["address", "address", "bytes32"],
    fields: [U("expires_at"), U("key_version")],
  },
  access_revoked: { topics: ["address", "address", "bytes32"], fields: [] },
  policy_set: {
    topics: ["address", "address"],
    fields: [I("max_per_claim"), U("valid_until"), { name: "active", kind: "bool" }],
  },
  claim_submitted: {
    topics: ["address", "address", "bytes32"],
    fields: [A("provider"), I("amount")],
  },
  claim_approved: { topics: ["address", "bytes32"], fields: [I("amount")] },
  claim_rejected: { topics: ["address", "bytes32"], fields: [B("reason_hash")] },
  claim_cancelled: { topics: ["address", "bytes32"], fields: [] },
  claim_paid: {
    topics: ["address", "address", "bytes32"],
    fields: [A("token"), I("amount")],
  },
};

/** Minimal structural view of an RPC event row — lets tests avoid network. */
export interface RawEvent {
  id: string;
  type?: string;
  ledger: number;
  ledgerClosedAt?: string;
  txHash: string;
  operationIndex?: number;
  contractId?: string;
  topic: xdr.ScVal[];
  value: xdr.ScVal;
}

export interface DecodedEvent {
  /** Stable id (also the pagination token) — React keys, deduping, sorting. */
  id: string;
  name: string;
  ledger: number;
  /** ISO close time from RPC; "" when unknown. */
  closedAt: string;
  txHash: string;
  opIndex: number;
  /** First address topic — the acting account. */
  actor: string;
  /** Every address topic in order. */
  accounts: string[];
  /** bytes32 topics, hex-encoded. */
  recordIds: string[];
  /** Named non-topic params, JSON-safe strings ("true"/"false"/decimals/hex). */
  fields: Record<string, string>;
}

function decodeScalar(sc: xdr.ScVal, kind: FieldKind): string {
  const native = scValToNative(sc);
  switch (kind) {
    case "bytes32": {
      const buf =
        native instanceof Buffer || native instanceof Uint8Array
          ? Buffer.from(native)
          : null;
      return buf ? buf.toString("hex") : "";
    }
    case "address":
      return typeof native === "string" ? native : "";
    case "role":
      // Unit enums decode to "Provider" or ["Provider"] depending on sdk version.
      return Array.isArray(native)
        ? String(native[0] ?? "")
        : String(native ?? "");
    case "uint":
    case "int":
      return typeof native === "bigint"
        ? native.toString()
        : String(native ?? "");
    case "bool":
      return native === true ? "true" : "false";
  }
}

/** Decode one raw RPC row using the schema table. Returns null if unknown. */
export function decodeContractEvent(raw: RawEvent): DecodedEvent | null {
  if (!raw.topic?.length) return null;
  let name: string;
  try {
    const nativeName = scValToNative(raw.topic[0]);
    name = typeof nativeName === "string" ? nativeName : String(nativeName);
  } catch {
    return null;
  }
  const schema = EVENT_SCHEMAS[name];
  if (!schema) return null;

  const accounts: string[] = [];
  const recordIds: string[] = [];
  schema.topics.forEach((kind, i) => {
    const sc = raw.topic[i + 1];
    if (!sc) return;
    const decoded = decodeScalar(sc, kind);
    if (kind === "address") accounts.push(decoded);
    if (kind === "bytes32") recordIds.push(decoded);
  });

  // The payload is usually a Vec ScVal, but newer RPC/SDK combinations may
  // expose named event data as a Map. Decode both shapes.
  const fields: Record<string, string> = {};
  try {
    if (raw.value.switch().name === "scvVec") {
      const vec = raw.value.vec() ?? [];
      schema.fields.forEach((spec, i) => {
        if (vec[i]) fields[spec.name] = decodeScalar(vec[i], spec.kind);
      });
    } else if (raw.value.switch().name === "scvMap") {
      for (const entry of raw.value.map() ?? []) {
        const key = scValToNative(entry.key());
        if (typeof key !== "string") continue;
        const spec = schema.fields.find((field) => field.name === key);
        if (spec) fields[key] = decodeScalar(entry.val(), spec.kind);
      }
    }
  } catch {
    /* malformed payload — leave fields partial */
  }

  return {
    id: raw.id,
    name,
    ledger: raw.ledger,
    closedAt: raw.ledgerClosedAt ?? "",
    txHash: raw.txHash,
    opIndex: raw.operationIndex ?? 0,
    actor: accounts[0] ?? "",
    accounts,
    recordIds,
    fields,
  };
}

/** Newest-first comparator across pages/filters (ledger, then op index, id). */
export function compareEventsDesc(a: DecodedEvent, b: DecodedEvent): number {
  if (b.ledger !== a.ledger) return b.ledger - a.ledger;
  if (b.opIndex !== a.opIndex) return b.opIndex - a.opIndex;
  return b.id.localeCompare(a.id);
}

// ---------------------------------------------------------------------------
// Fetching — cursor pagination, start-ledger fallback ladder, single-flight.
// ---------------------------------------------------------------------------

export interface EventFetchResult {
  events: DecodedEvent[];
  /** ms epoch of the oldest retained ledger — "" retention watermark. */
  watermarkIso: string;
  latestLedger: number;
}

/** Normalize RPC timestamps across node versions (RFC-3339, seconds, or ms). */
function timestampToIso(value: unknown): string | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    const milliseconds = value < 1e12 ? value * 1000 : value;
    const date = new Date(milliseconds);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }
  if (typeof value === "string" && value.trim()) {
    const numeric = Number(value);
    if (Number.isFinite(numeric)) return timestampToIso(numeric);
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }
  return null;
}

interface CacheEntry {
  at: number;
  promise: Promise<EventFetchResult>;
}

const CACHE_TTL_MS = 30_000;
const cache = new Map<string, CacheEntry>();

let serverSingleton: rpc.Server | null = null;
function server(): rpc.Server {
  if (!serverSingleton) {
    assertConfig();
    serverSingleton = new rpc.Server(RPC_URL, {
      allowHttp: RPC_URL.startsWith("http://"),
    });
  }
  return serverSingleton;
}

/** Recent RPC event range; some nodes accept wider ranges but return no rows. */
const START_LEDGER_LADDER = [8_640, 3_600, 720, 100];

async function firstStartLedger(): Promise<number> {
  const latest = await server().getLatestLedger();
  for (const offset of START_LEDGER_LADDER) {
    const candidate = Math.max(1, latest.sequence - offset);
    try {
      await server().getEvents({ filters: [], startLedger: candidate, limit: 1 });
      return candidate;
    } catch {
      // Range rejected (pruned) — try a shorter window.
    }
  }
  return Math.max(1, latest.sequence - 100);
}

async function fetchUncached(patterns: string[][]): Promise<EventFetchResult> {
  const filters = contractFilters(patterns);
  const startLedger = await firstStartLedger();
  const seen = new Map<string, DecodedEvent>();
  let watermarkIso = "";
  let latestLedger = startLedger;

  for (const filterSet of filters) {
    let request: rpc.Api.GetEventsRequest = {
      filters: [filterSet],
      startLedger,
      limit: 200,
    };
    // Cursor pagination per filter group.
    for (;;) {
      const response = await server().getEvents(request);
      latestLedger = Math.max(latestLedger, response.latestLedger ?? 0);
      // Retention watermark — RFC 3339 close time of the oldest ledger kept.
      const wm = response.oldestLedgerCloseTime;
      if (wm) {
        const iso = timestampToIso(wm);
        if (iso && (!watermarkIso || iso < watermarkIso)) watermarkIso = iso;
      }
      for (const row of response.events as RawEvent[]) {
        // Request already scopes events to CONTRACT_ID. Do not re-filter on
        // parsed `contractId`: SDK versions expose it as different object
        // shapes, which can silently discard valid events.
        const decoded = decodeContractEvent(row);
        if (decoded) seen.set(decoded.id, decoded);
      }
      const { cursor } = response;
      if (!cursor || !response.events.length || seen.size >= 5_000) break;
      request = { filters: [filterSet], cursor, limit: 200 };
    }
  }

  const events = [...seen.values()].sort(compareEventsDesc);
  return { events, watermarkIso, latestLedger };
}

/**
 * Fetch + decode contract events for the given topic patterns. Results are
 * cached for 30s (single-flight) so many components can share one fetch.
 */
export async function fetchContractEvents(
  patterns: string[][],
): Promise<EventFetchResult> {
  const key = `${CONTRACT_ID}|${JSON.stringify(patterns)}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.promise;
  const promise = fetchUncached(patterns).finally(() => {
    setTimeout(() => cache.delete(key), CACHE_TTL_MS);
  });
  cache.set(key, { at: Date.now(), promise });
  return promise;
}

/** Test hook — drop memoized results. */
export function clearEventCache(): void {
  cache.clear();
}
