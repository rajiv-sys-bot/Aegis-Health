"use client";

/**
 * Claims console — the insurance lifecycle as one auditable list.
 * Approvals, rejections and payouts are real contract calls signed
 * by your wallet through the global toast flow.
 */

import { useState } from "react";
import { CircleDollarSign } from "lucide-react";
import { useWallet } from "@/components/wallet-provider";
import { useToast } from "@/components/toast";
import {
  AddressChip,
  Button,
  Card,
  CardHeader,
  ClaimStepper,
  claimStatusTone,
  EmptyState,
  ErrorState,
  ExpiryTimer,
  PageHeader,
  Skeleton,
  StatCard,
  StatRow,
  StatusPill,
} from "@/components/health-ui";
import { useInsurerView } from "@/hooks/use-views";
import { formatAmount, shortAddress } from "@/lib/format";
import { describeTxError, hexToBuffer, runWrite } from "@/lib/stellar";

/** Random commitment for the off-chain rejection reason document. */
function randomReasonHash(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

type ClaimAction = "approve" | "reject" | "pay" | "cancel";

export default function ClaimsPage() {
  const { address } = useWallet();
  const toast = useToast();
  const view = useInsurerView(address);
  const [busyClaim, setBusyClaim] = useState<string | null>(null);

  const act = async (action: ClaimAction, claimId: string) => {
    if (!address || busyClaim) return;
    setBusyClaim(claimId);
    const pending = toast.push({
      tone: "pending",
      message: `Confirm the ${action} signature in Freighter…`,
    });
    try {
      const { hash } = await runWrite(address, (client) => {
        if (action === "approve") {
          return client.approve_claim({
            insurer: address,
            claim_id: hexToBuffer(claimId),
          });
        }
        if (action === "reject") {
          return client.reject_claim({
            insurer: address,
            claim_id: hexToBuffer(claimId),
            reason_hash: hexToBuffer(randomReasonHash()),
          });
        }
        if (action === "cancel") {
          return client.cancel_claim({
            patient: address,
            claim_id: hexToBuffer(claimId),
          });
        }
        return client.pay_claim({
          insurer: address,
          claim_id: hexToBuffer(claimId),
        });
      });
      toast.push({
        tone: "success",
        message:
          action === "approve"
            ? "Claim approved on-chain."
            : action === "reject"
              ? "Claim rejected — reason anchored by hash."
              : action === "cancel"
                ? "Claim cancelled."
                : "Provider payout settled atomically.",
        txHash: hash,
        id: pending,
      });
      view.refresh();
    } catch (e) {
      toast.push({ tone: "error", message: describeTxError(e), id: pending });
    } finally {
      setBusyClaim(null);
    }
  };

  if (!address) {
    return (
      <main className="mx-auto max-w-7xl px-4 pt-10 sm:px-6 lg:px-8">
        <PageHeader
          eyebrow="Insurance settlement"
          title="Connect a wallet"
          description="Insurers sign approvals and payouts; patients can cancel their own pending claims."
        />
        <Card>
          <EmptyState
            icon="🔑"
            title="No wallet connected"
            body="Claims load from contract events once a wallet is connected."
          />
        </Card>
      </main>
    );
  }

  const loadingFirst = view.loading && view.claims.length === 0;
  const countBy = (status: string) =>
    view.claims.filter((c) => c.status === status).length;

  return (
    <main className="mx-auto max-w-7xl px-4 pt-8 pb-28 sm:px-6 sm:pt-10 lg:px-8">
      <PageHeader
        eyebrow="Insurance settlement"
        title="Claims, without the black box"
        description="Coverage rules, approval, and settlement share one auditable lifecycle."
      />

      {view.error ? (
        <div className="mb-5">
          <ErrorState message={view.error} onRetry={view.refresh} />
        </div>
      ) : null}

      <StatRow>
        <StatCard label="Total claims" value={loadingFirst ? "…" : view.claims.length} accent />
        <StatCard label="Pending review" value={loadingFirst ? "…" : countBy("Pending")} />
        <StatCard label="Approved" value={loadingFirst ? "…" : countBy("Approved")} />
        <StatCard label="Paid out" value={loadingFirst ? "…" : countBy("Paid")} />
      </StatRow>

      {/* ------------------------------------------------------ policies */}
      <section className="mt-6">
        <Card>
          <CardHeader
            title="Policies in force"
            description="Per-patient coverage the contract enforces at approval and payout."
          />
          {Object.keys(view.policies).length > 0 ? (
            <div className="divide-y divide-line">
              {Object.entries(view.policies).map(([patient, policy]) => (
                <div
                  key={patient}
                  className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5"
                >
                  <div className="min-w-0">
                    <AddressChip address={patient} link />
                    <p className="mt-1 flex items-center gap-2 text-xs text-ink-muted">
                      max {formatAmount(policy.maxPerClaim)} per claim
                      <ExpiryTimer expiresAt={policy.validUntil} nowSec={view.nowSec} />
                    </p>
                  </div>
                  <StatusPill tone={policy.active ? "success" : "neutral"}>
                    {policy.active ? "active" : "inactive"}
                  </StatusPill>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No policy on-chain yet"
              body="The insurer sets coverage with a set_policy call — the seeded demo creates one."
            />
          )}
        </Card>
      </section>

      {/* -------------------------------------------------------- claims */}
      <section className="mt-6">
        <Card>
          <CardHeader
            title="Claim ledger"
            description="One row per claim, folded from submit → settle events."
            actions={
              <Button variant="ghost" size="sm" onClick={view.refresh}>
                Refresh
              </Button>
            }
          />
          {loadingFirst ? (
            <div className="space-y-3 p-5">
              <Skeleton className="h-16" />
              <Skeleton className="h-16" />
              <Skeleton className="h-16" />
            </div>
          ) : view.claims.length === 0 ? (
            <EmptyState
              icon="◇"
              title="No claims yet"
              body="Claims filed against your records appear here after the next poll."
            />
          ) : (
            <div className="divide-y divide-line">
              {view.claims.map((claim) => {
                const busy = busyClaim === claim.claimId;
                const isInsurer = claim.insurer === address;
                const isPatient = claim.patient === address;
                const canAct =
                  (claim.status === "Pending" && (isInsurer || isPatient)) ||
                  (claim.status === "Approved" && isInsurer);
                return (
                  <div
                    key={claim.claimId}
                    className="flex flex-wrap items-start justify-between gap-3 px-5 py-4"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-[13px] font-semibold text-ink-strong">
                          {shortAddress(claim.claimId, 10, 8)}
                        </span>
                        <StatusPill tone={claimStatusTone(claim.status)}>
                          {claim.status}
                        </StatusPill>
                      </div>
                      <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-muted">
                        {formatAmount(claim.amount)} · patient{" "}
                        <AddressChip address={claim.patient} link /> → provider{" "}
                        <AddressChip address={claim.provider} link />
                      </p>
                      <div className="mt-2">
                        <ClaimStepper status={claim.status} />
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {!canAct && claim.status !== "Paid" && claim.status !== "Cancelled" ? (
                        <span className="text-xs text-ink-muted">awaiting counterparty</span>
                      ) : null}
                      {busy ? (
                        <Button size="sm" loading />
                      ) : (
                        <>
                          {claim.status === "Pending" && isInsurer ? (
                            <>
                              <Button emphasis size="sm" onClick={() => void act("approve", claim.claimId)}>
                                Approve
                              </Button>
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => void act("reject", claim.claimId)}
                              >
                                Reject
                              </Button>
                            </>
                          ) : null}
                          {claim.status === "Pending" && isPatient ? (
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => void act("cancel", claim.claimId)}
                            >
                              Cancel
                            </Button>
                          ) : null}
                          {claim.status === "Approved" && isInsurer ? (
                            <Button emphasis size="sm" onClick={() => void act("pay", claim.claimId)}>
                              Pay provider
                            </Button>
                          ) : null}
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </section>

      <p className="mt-8 flex items-center gap-2 text-xs font-medium text-ink-muted">
        <CircleDollarSign className="size-4 text-brand-600" />
        Payouts transfer the policy token from insurer to provider inside the
        claim transaction — atomic, no batch files.
      </p>
    </main>
  );
}
