"use client";

/**
 * Patient dashboard — the consent cockpit. Every row comes from contract
 * events + ledger reads (hooks/use-views), never from local demo state.
 */

import { useState } from "react";
import { KeyRound } from "lucide-react";
import { AccessGrantModal } from "@/components/access-grant-modal";
import { useWallet } from "@/components/wallet-provider";
import { useToast } from "@/components/toast";
import {
  AccessGrantRow,
  AddressChip,
  AuditLogEntry,
  Banner,
  Button,
  Card,
  CardHeader,
  ClaimStepper,
  claimStatusTone,
  EmptyState,
  ErrorState,
  PageHeader,
  RecordCard,
  Skeleton,
  StatCard,
  StatRow,
  StatusPill,
} from "@/components/health-ui";
import { usePatientView } from "@/hooks/use-views";
import type { DecodedEvent } from "@/lib/events";
import { formatAmount, shortAddress, timeGreeting } from "@/lib/format";
import { describeTxError, hexToBuffer, runWrite } from "@/lib/stellar";

/** One-line human context for an activity-feed event. */
function eventDetail(e: DecodedEvent): string {
  const who = e.accounts[1] ? shortAddress(e.accounts[1], 6, 6) : "";
  const what = e.recordIds[0] ? shortAddress(e.recordIds[0], 8, 6) : "";
  switch (e.name) {
    case "record_registered":
      return `provider ${shortAddress(e.fields.provider ?? "", 6, 6)}${what ? ` · ${what}` : ""}`;
    case "access_granted":
      return `${who} granted on ${what}`;
    case "access_revoked":
      return `${who} revoked on ${what}`;
    case "access_requested":
      return `until ledger expiry · ${what}`;
    case "policy_set":
      return `${formatAmount(e.fields.max_per_claim ?? "0")} max per claim`;
    case "claim_submitted":
    case "claim_approved":
    case "claim_paid":
      return `${formatAmount(e.fields.amount || "0")} · ${who}`;
    default:
      return [who, what].filter(Boolean).join(" · ") || "—";
  }
}

interface ModalTarget {
  recordIdHex: string;
  grantee?: string;
}

export default function PatientDashboard() {
  const { address } = useWallet();
  const toast = useToast();
  const view = usePatientView(address);
  const [modal, setModal] = useState<ModalTarget | null>(null);
  const [busyClaim, setBusyClaim] = useState<string | null>(null);

  const openGrant = (recordIdHex: string, grantee?: string) =>
    setModal({ recordIdHex, grantee });

  const revoke = async (recordId: string, grantee: string) => {
    if (!address) return;
    const pending = toast.push({
      tone: "pending",
      message: "Confirm the revoke signature in Freighter…",
    });
    try {
      const { hash } = await runWrite(address, (client) =>
        client.revoke_access({
          patient: address,
          record_id: hexToBuffer(recordId),
          grantee,
        }),
      );
      toast.push({ tone: "success", message: "Access revoked.", txHash: hash, id: pending });
      view.refresh();
    } catch (e) {
      toast.push({ tone: "error", message: describeTxError(e), id: pending });
    }
  };

  const cancelClaim = async (claimId: string) => {
    if (!address) return;
    setBusyClaim(claimId);
    const pending = toast.push({
      tone: "pending",
      message: "Confirm the cancellation in Freighter…",
    });
    try {
      const { hash } = await runWrite(address, (client) =>
        client.cancel_claim({ patient: address, claim_id: hexToBuffer(claimId) }),
      );
      toast.push({ tone: "success", message: "Claim cancelled.", txHash: hash, id: pending });
      view.refresh();
    } catch (e) {
      toast.push({ tone: "error", message: describeTxError(e), id: pending });
    } finally {
      setBusyClaim(null);
    }
  };

  if (!address) {
    return (
      <main className="mx-auto max-w-[1280px] px-4 pt-10 sm:px-6 lg:px-8">
        <PageHeader
          eyebrow="Patient workspace"
          title="Connect your wallet"
          description="Your records stay encrypted; this dashboard reads consent state straight from the Soroban ledger."
        />
        <Card>
          <EmptyState
            icon="🔑"
            title="No wallet connected"
            body="Connect Freighter to load your records, grants and claims."
          />
        </Card>
      </main>
    );
  }

  const loadingFirst = view.loading && view.records.length === 0;

  return (
    <main className="mx-auto max-w-[1280px] px-4 pt-8 pb-28 sm:px-6 sm:pt-10 lg:px-8">
      <PageHeader
        eyebrow="Patient workspace"
        title={timeGreeting()}
        description="Your records remain encrypted off-chain. You decide who can open them, until when — every change is a signed transaction."
        actions={
          <Button
            onClick={() => view.records[0] && openGrant(view.records[0].id)}
            disabled={view.records.length === 0}
          >
            <KeyRound className="size-4" />
            Grant access
          </Button>
        }
      />

      {view.error ? (
        <div className="mb-5">
          <ErrorState message={view.error} onRetry={view.refresh} />
        </div>
      ) : null}
      {view.missing > 0 ? (
        <div className="mb-5">
          <Banner tone="warning">
            {view.missing} record{view.missing === 1 ? "" : "s"} referenced in
            events could not be loaded — they may have been pruned by retention.
          </Banner>
        </div>
      ) : null}

      <StatRow>
        <StatCard label="Encrypted records" value={loadingFirst ? "…" : view.records.length} accent />
        <StatCard label="Active grants" value={loadingFirst ? "…" : view.grants.length} />
        <StatCard label="Claims" value={loadingFirst ? "…" : view.claims.length} />
        <StatCard label="Ledger events" value={loadingFirst ? "…" : view.activityCount} />
      </StatRow>

      {/* ---------------------------------------------------------- records */}
      <section className="mt-9">
        <Card>
          <CardHeader
            title="Your records"
            description="Content stays with your clinic; only integrity hashes are on-chain."
            actions={<Button variant="ghost" size="sm" onClick={view.refresh}>Refresh</Button>}
          />
          <div className="p-5">
            {loadingFirst ? (
              <div className="grid gap-4 md:grid-cols-2">
                <Skeleton className="h-44" />
                <Skeleton className="h-44" />
              </div>
            ) : view.records.length === 0 ? (
              <EmptyState
                icon="◇"
                title="No records registered yet"
                body='Run "npm run setup" to deploy + seed the contract, or register one from a provider account.'
              />
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {view.records.map((record) => (
                  <RecordCard
                    key={record.id}
                    id={record.id}
                    provider={record.provider}
                    contentHash={record.contentHash}
                    createdAt={record.createdAt}
                    updatedAt={record.updatedAt}
                    keyVersion={record.keyVersion}
                    activeGrants={
                      view.grants.filter((g) => g.recordId === record.id).length
                    }
                    nowSec={view.nowSec}
                    actions={
                      <Button size="sm" onClick={() => openGrant(record.id)}>
                        <KeyRound className="size-3.5" />
                        Grant access
                      </Button>
                    }
                  />
                ))}
              </div>
            )}
          </div>
        </Card>
      </section>

      <div className="mt-6 grid gap-5 lg:grid-cols-[1.1fr_.9fr]">
        {/* ------------------------------------------------------ grants */}
        <section>
          <Card>
            <CardHeader
              title="Active access"
              description="Expiry enforced by the ledger timestamp — revoke any time."
            />
            {loadingFirst ? (
              <div className="space-y-3 px-5 py-4">
                <Skeleton className="h-12" />
                <Skeleton className="h-12" />
              </div>
            ) : view.grants.length === 0 ? (
              <EmptyState
                title="Nobody has access right now"
                body="Grants you sign appear here with a live countdown."
              />
            ) : (
              <div className="divide-y divide-line">
                {view.grants.map((grant) => (
                  <AccessGrantRow
                    key={`${grant.recordId}:${grant.grantee}`}
                    recordId={grant.recordId}
                    grantee={grant.grantee}
                    roleLabel={grant.roleLabel}
                    expiresAt={grant.expiresAt}
                    nowSec={view.nowSec}
                    actions={
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => void revoke(grant.recordId, grant.grantee)}
                      >
                        Revoke
                      </Button>
                    }
                  />
                ))}
              </div>
            )}
          </Card>

          {/* ----------------------------------------------- claims */}
          <Card className="mt-5">
            <CardHeader
              title="Claims"
              description="Insurance lifecycle settled on-chain."
            />
            {view.claims.length === 0 ? (
              <EmptyState
                title="No claims submitted"
                body="Claims filed against your records appear here."
              />
            ) : (
              <div className="divide-y divide-line">
                {view.claims.map((claim) => (
                  <div key={claim.claimId} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5">
                    <div className="min-w-0">
                      <p className="font-mono text-[13px] font-semibold text-ink-strong">
                        {shortAddress(claim.claimId, 10, 8)}
                      </p>
                      <p className="mt-1 flex items-center gap-1.5 text-xs text-ink-muted">
                        {formatAmount(claim.amount)}
                        <ClaimStepper status={claim.status} />
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusPill tone={claimStatusTone(claim.status)}>
                        {claim.status}
                      </StatusPill>
                      {claim.status === "Pending" ? (
                        <Button
                          variant="secondary"
                          size="sm"
                          loading={busyClaim === claim.claimId}
                          onClick={() => void cancelClaim(claim.claimId)}
                        >
                          Cancel
                        </Button>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </section>

        {/* ------------------------------------------- requests + pulse */}
        <section>
          <Card>
            <CardHeader
              title="Access requests"
              description="Clinics asking to open one of your records. Granting is always your call."
            />
            {view.requests.length === 0 ? (
              <EmptyState
                title="No pending requests"
                body="Requests land here the moment a provider signs one."
              />
            ) : (
              <div className="divide-y divide-line">
                {view.requests.map((request) => (
                  <div key={request.eventId} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5">
                    <div className="min-w-0">
                      <AddressChip address={request.requester} link />
                      <p className="mt-1 font-mono text-xs text-ink-muted">
                        record {shortAddress(request.recordId, 6, 6)}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => openGrant(request.recordId, request.requester)}
                    >
                      Review &amp; grant
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card className="mt-5">
            <CardHeader
              title="Consent pulse"
              description="Latest verified contract events."
            />
            {view.events.length === 0 ? (
              <Skeleton className="m-5 h-20" />
            ) : (
              <div className="divide-y divide-line">
                {view.events.slice(0, 8).map((event) => (
                  <AuditLogEntry
                    key={event.id}
                    name={event.name.replace(/_/g, " ")}
                    description={eventDetail(event)}
                    actor={event.actor || undefined}
                    txHash={event.txHash}
                    closedAt={event.closedAt || undefined}
                    nowSec={view.nowSec}
                  />
                ))}
              </div>
            )}
          </Card>
        </section>
      </div>

      <SecurityFooter />

      <AccessGrantModal
        open={modal !== null}
        onClose={() => setModal(null)}
        recordIdHex={modal?.recordIdHex ?? ""}
        grantee={modal?.grantee}
        onGranted={view.refresh}
      />
    </main>
  );
}

function SecurityFooter() {
  return (
    <p className="mt-10 flex items-center gap-2 text-xs font-medium text-ink-muted">
      Records stay encrypted off-chain — this page only ever sees hashes and
      permissions anchored on Stellar testnet.
    </p>
  );
}
