"use client";

/**
 * Composition hooks: contract events (lib/events.ts) + pure reducers
 * (lib/event-reducers.ts) + hydration reads (lib/reads.ts) → the exact view
 * models the dashboards render. All state stays JSON-safe.
 */

import { useEffect, useMemo, useState } from "react";
import {
  adminFilters,
  auditFilters,
  insurerFilters,
  patientFilters,
  providerFilters,
} from "@/lib/events";
import {
  claimLifecycles,
  collectRecordIds,
  currentGrants,
  knownRoles,
  sentRequests,
  type AccessRequest,
  type ClaimLifecycle,
  type ClaimStatus,
  type RoleAssignment,
} from "@/lib/event-reducers";
import {
  contractAdmin,
  getClaim,
  getPolicy,
  getRecord,
  hasAccess,
  mapLimit,
  roleOf,
  type PolicyView,
  type RecordView,
} from "@/lib/reads";
import type { DecodedEvent } from "@/lib/events";
import { useContractEvents } from "./use-contract-events";
import { useNow } from "./use-async";

// ---------------------------------------------------------------------------
// Shared hydration helpers
// ---------------------------------------------------------------------------

interface Hydration<T> {
  rows: T[];
  missing: number;
  loading: boolean;
}

/**
 * Hydrate ids → full views with bounded concurrency, sorted newest first.
 *
 * The settled result carries the id-list `key` that produced it; `loading` is
 * derived (settled key ≠ current key) so no state is touched synchronously
 * inside the effect. An empty list settles instantly as empty via derivation.
 */
function useHydrated<T>(
  ids: string[],
  load: (id: string) => Promise<T | null>,
): Hydration<T> {
  const key = ids.join(",");
  const [settled, setSettled] = useState<{
    key: string;
    rows: T[];
    missing: number;
  }>({ key: "", rows: [], missing: 0 });

  useEffect(() => {
    const list = key.split(",").filter(Boolean);
    if (list.length === 0) return;
    let cancelled = false;
    void mapLimit(list, 6, load).then((results) => {
      if (cancelled) return;
      const found = results.filter((r): r is T => r !== null);
      setSettled({
        key,
        rows: found,
        missing: results.length - found.length,
      });
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const fresh = settled.key === key;
  return {
    rows: fresh ? settled.rows : [],
    missing: fresh ? settled.missing : 0,
    loading: !fresh && key !== "",
  };
}

// ---------------------------------------------------------------------------
// Role
// ---------------------------------------------------------------------------

export interface RoleState {
  role: string | null;
  isAdmin: boolean;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

/** Contract-assigned role + admin flag for the connected wallet. */
export function useRole(address: string | null, demoAdmin?: string): RoleState {
  // Settled result remembers which address it belongs to; values for the
  // current address are derived at return so disconnecting never shows stale
  // state and the effect body stays free of synchronous setState.
  const [settled, setSettled] = useState<{
    address: string | null;
    role: string | null;
    admin: string | null;
  }>({ address: null, role: null, admin: null });
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    if (!address) return;
    let cancelled = false;
    void Promise.all([roleOf(address), contractAdmin()])
      .then(([r, a]) => {
        if (cancelled) return;
        setSettled({ address, role: r, admin: a });
        setError(null);
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Could not load role.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [address, nonce]);

  const fresh = Boolean(address) && settled.address === address;
  return {
    role: fresh ? settled.role : null,
    // On-chain check once settled; falls back to the seeded demo admin while
    // the read is in flight or failed.
    isAdmin: Boolean(
      address &&
        (fresh
          ? settled.admin === address
          : settled.admin === demoAdmin && Boolean(demoAdmin)),
    ),
    loading: Boolean(address) && !fresh,
    error,
    refresh: () => setNonce((n) => n + 1),
  };
}

// ---------------------------------------------------------------------------
// Patient dashboard
// ---------------------------------------------------------------------------

export interface PatientGrantRow {
  recordId: string;
  grantee: string;
  roleLabel: string | null;
  expiresAt: number;
}

export interface PatientView {
  records: RecordView[];
  grants: PatientGrantRow[];
  requests: AccessRequest[];
  claims: ClaimLifecycle[];
  /** Raw decoded events — activity feeds. Newest first. */
  events: DecodedEvent[];
  activityCount: number;
  /** Records whose on-chain row is gone (rotated away / retention). */
  missing: number;
  loading: boolean;
  error: string | null;
  refresh: () => void;
  nowSec: number;
}

export function usePatientView(address: string | null): PatientView {
  const { events, loading: eventsLoading, error, refresh } =
    useContractEvents(address ? patientFilters(address) : null);
  const nowSec = useNow(30);

  const recordIds = useMemo(
    () => (address ? collectRecordIds(events, address) : []),
    [events, address],
  );
  const { rows: records, missing } = useHydrated(recordIds, getRecord);

  const grants = useMemo(() => currentGrants(events, nowSec), [events, nowSec]);

  const [grantRoles, setGrantRoles] = useState<Record<string, string | null>>({});
  const granteeKey = useMemo(
    () => [...new Set(grants.map((g) => g.grantee))].sort().join(","),
    [grants],
  );
  useEffect(() => {
    const grantees = granteeKey.split(",").filter(Boolean);
    // Empty list → keep the previous lookup; readers default to `null` for
    // unknown grantees, so no synchronous reset is needed here.
    if (grantees.length === 0) return;
    let cancelled = false;
    void mapLimit(grantees, 6, roleOf).then((roles) => {
      if (cancelled) return;
      const map: Record<string, string | null> = {};
      grantees.forEach((g, i) => {
        map[g] = roles[i];
      });
      setGrantRoles(map);
    });
    return () => {
      cancelled = true;
    };
  }, [granteeKey]);

  const claims = useMemo(() => claimLifecycles(events), [events]);

  // Inbound requests: scan all access_requested, keep ones targeting my records.
  const requests = useMemo(() => {
    const mine = new Set(recordIds);
    return sentRequests(events).filter((r) => mine.has(r.recordId));
  }, [events, recordIds]);

  const grantRows: PatientGrantRow[] = useMemo(
    () =>
      grants
        .filter((g) => g.patient === address)
        .map((g) => ({
          recordId: g.recordId,
          grantee: g.grantee,
          roleLabel: grantRoles[g.grantee] ?? null,
          expiresAt: g.expiresAt,
        })),
    [grants, address, grantRoles],
  );

  return {
    records,
    grants: grantRows,
    requests: requests,
    claims,
    events,
    activityCount: events.length,
    missing,
    loading: eventsLoading,
    error,
    refresh,
    nowSec,
  };
}

// ---------------------------------------------------------------------------
// Provider (doctor) dashboard
// ---------------------------------------------------------------------------

export interface DoctorRequestRow extends AccessRequest {
  granted: boolean;
}

export interface DoctorGrantRow {
  record: RecordView;
  expiresAt: number;
  live: boolean | null;
}

export interface DoctorView {
  requests: DoctorRequestRow[];
  granted: DoctorGrantRow[];
  provided: RecordView[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
  nowSec: number;
}

export function useDoctorView(address: string | null): DoctorView {
  const { events, loading: eventsLoading, error, refresh } =
    useContractEvents(address ? providerFilters(address) : null);
  const nowSec = useNow(30);

  const liveGrants = useMemo(() => currentGrants(events, nowSec), [events, nowSec]);
  const myGrants = useMemo(
    () => liveGrants.filter((g) => g.grantee === address),
    [liveGrants, address],
  );

  const grantedIds = useMemo(
    () => [...new Set(myGrants.map((g) => g.recordId))],
    [myGrants],
  );
  const { rows: grantedRecords } = useHydrated(grantedIds, getRecord);

  const providedIds = useMemo(() => {
    if (!address) return [];
    const ids: string[] = [];
    const seen = new Set<string>();
    for (const e of events) {
      if (e.name !== "record_registered") continue;
      if (e.fields.provider !== address) continue;
      const id = e.recordIds[0];
      if (id && !seen.has(id)) {
        seen.add(id);
        ids.push(id);
      }
    }
    return ids;
  }, [events, address]);
  const { rows: providedRecords } = useHydrated(providedIds, getRecord);

  const requests = useMemo<DoctorRequestRow[]>(() => {
    const grantedSet = new Set(myGrants.map((g) => g.recordId));
    return sentRequests(events)
      .filter((r) => r.requester === address)
      .map((r) => ({ ...r, granted: grantedSet.has(r.recordId) }));
  }, [events, address, myGrants]);

  return {
    requests,
    granted: myGrants
      .map((g): DoctorGrantRow | null => {
        const record = grantedRecords.find((r) => r.id === g.recordId);
        return record ? { record, expiresAt: g.expiresAt, live: null } : null;
      })
      .filter((r): r is DoctorGrantRow => r !== null),
    provided: providedRecords,
    loading: eventsLoading,
    error,
    refresh,
    nowSec,
  };
}

/** On-demand live check used by the doctor page's verify button. */
export function verifyAccess(recordId: string, grantee: string): Promise<boolean> {
  return hasAccess(recordId, grantee);
}

// ---------------------------------------------------------------------------
// Insurer (claims) view
// ---------------------------------------------------------------------------

export interface ClaimRow extends ClaimLifecycle {
  evidenceHash: string;
  submittedAt: number;
  recordId: string;
}

export interface InsurerView {
  claims: ClaimRow[];
  /** policy per patient (keyed by patient address). */
  policies: Record<string, PolicyView>;
  loading: boolean;
  error: string | null;
  refresh: () => void;
  nowSec: number;
}

export function useInsurerView(address: string | null): InsurerView {
  const { events, loading: eventsLoading, error, refresh } =
    useContractEvents(address ? insurerFilters(address) : null);
  const nowSec = useNow(30);

  const lifecycles = useMemo(
    () =>
      claimLifecycles(events).filter(
        (c) => !address || c.insurer === address || c.patient === address,
      ),
    [events, address],
  );

  const claimIds = useMemo(() => lifecycles.map((c) => c.claimId), [lifecycles]);
  const { rows: fullClaims } = useHydrated(claimIds, getClaim);

  const claims = useMemo<ClaimRow[]>(() => {
    return lifecycles.map((lifecycle) => {
      const hydrated = fullClaims.find((c) => c.claimId === lifecycle.claimId);
      return {
        ...lifecycle,
        evidenceHash: hydrated?.evidenceHash ?? "",
        submittedAt: hydrated?.submittedAt ?? 0,
        recordId: hydrated?.recordId ?? "",
        status: (hydrated?.status ?? lifecycle.status) as ClaimStatus,
      };
    });
  }, [lifecycles, fullClaims]);

  const patients = useMemo(
    () => [...new Set(claims.map((c) => c.patient))].filter(Boolean),
    [claims],
  );
  const [policies, setPolicies] = useState<Record<string, PolicyView>>({});

  useEffect(() => {
    // No patients yet → keep whatever is settled; readers treat a missing
    // policy entry as "none on-chain", so no synchronous reset is needed.
    if (!address || patients.length === 0) return;
    let cancelled = false;
    void mapLimit(patients, 4, (patient) => getPolicy(address, patient)).then(
      (results) => {
        if (cancelled) return;
        const map: Record<string, PolicyView> = {};
        patients.forEach((p, i) => {
          if (results[i]) map[p] = results[i];
        });
        setPolicies(map);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [address, patients]);

  return { claims, policies, loading: eventsLoading, error, refresh, nowSec };
}

// ---------------------------------------------------------------------------
// Admin + audit
// ---------------------------------------------------------------------------

export function useRoleRegistry(): {
  roles: RoleAssignment[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
} {
  const { events, loading, error, refresh } = useContractEvents(adminFilters());
  const roles = useMemo(() => knownRoles(events), [events]);
  return { roles, loading, error, refresh };
}

export function useAuditFeed(): ReturnType<typeof useContractEvents> {
  return useContractEvents(auditFilters());
}
