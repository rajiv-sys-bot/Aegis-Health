"use client";

/**
 * Clinic workspace — request access to a record, track what patients have
 * granted, and verify live permission before every fetch.
 */

import { FormEvent, useState } from "react";
import { Send, ShieldCheck } from "lucide-react";
import { useWallet } from "@/components/wallet-provider";
import { useToast } from "@/components/toast";
import {
  AddressChip,
  Button,
  Card,
  CardHeader,
  EmptyState,
  ErrorState,
  ExpiryTimer,
  Field,
  Input,
  PageHeader,
  RecordCard,
  Skeleton,
  StatRow,
  StatCard,
  StatusPill,
} from "@/components/health-ui";
import { useDoctorView, verifyAccess } from "@/hooks/use-views";
import { shortAddress } from "@/lib/format";
import { contractClient, hexToBuffer, transactionHash } from "@/lib/stellar";

const DURATIONS = [
  { label: "1 hour", value: 3_600 },
  { label: "1 day", value: 86_400 },
  { label: "1 week", value: 604_800 },
];

export default function DoctorDashboard() {
  const { address, connect } = useWallet();
  const toast = useToast();
  const view = useDoctorView(address);

  const [patient, setPatient] = useState("");
  const [recordId, setRecordId] = useState("");
  const [duration, setDuration] = useState(86_400);
  const [submitting, setSubmitting] = useState(false);
  const [verifying, setVerifying] = useState<string | null>(null);

  const requestAccess = async (event: FormEvent) => {
    event.preventDefault();
    try {
      if (!address) {
        await connect();
        return;
      }
      if (!/^G[A-Z2-7]{55}$/.test(patient.trim().toUpperCase())) {
        throw new Error("Enter a valid patient wallet address (G…).");
      }
      if (!/^[0-9a-fA-F]{64}$/.test(recordId.trim())) {
        throw new Error("Enter the record's 64-character SHA-256 id.");
      }
      setSubmitting(true);
      const pending = toast.push({
        tone: "pending",
        message: "Sign the access request with your clinic wallet…",
      });
      const tx = await contractClient(address).request_access({
        requester: address,
        record_id: hexToBuffer(recordId),
        requested_until: BigInt(Math.floor(Date.now() / 1000) + duration),
      });
      const sent = await tx.signAndSend();
      toast.push({
        tone: "success",
        message: "Request logged on-chain — the patient can now grant access.",
        txHash: transactionHash(sent),
        id: pending,
      });
      view.refresh();
    } catch (cause) {
      toast.push({
        tone: "error",
        message:
          cause instanceof Error ? cause.message : "The request failed.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const verify = async (record: string) => {
    if (!address || verifying) return;
    setVerifying(record);
    try {
      const live = await verifyAccess(record, address);
      if (live) {
        toast.push({ tone: "success", message: "Live grant verified on-ledger." });
      } else {
        toast.push({
          tone: "error",
          message: "No active grant for this record — fetch blocked.",
        });
      }
    } finally {
      setVerifying(null);
    }
  };

  if (!address) {
    return (
      <main className="mx-auto max-w-[1280px] px-4 pt-10 sm:px-6 lg:px-8">
        <PageHeader
          eyebrow="Clinical workspace"
          title="Connect your clinic wallet"
          description="Requests and grants are signed transactions — nothing happens without your wallet."
        />
        <Card>
          <EmptyState
            icon="🔑"
            title="No wallet connected"
            body="Connect Freighter to request record access."
          />
        </Card>
      </main>
    );
  }

  const loadingFirst = view.loading && view.granted.length === 0;

  return (
    <main className="mx-auto max-w-[1280px] px-4 pt-8 pb-28 sm:px-6 sm:pt-10 lg:px-8">
      <PageHeader
        eyebrow="Clinical workspace"
        title="Care access, with consent"
        description="Request only what this visit needs. The patient's approval is required before any encrypted byte can be fetched."
      />

      {view.error ? (
        <div className="mb-5">
          <ErrorState message={view.error} onRetry={view.refresh} />
        </div>
      ) : null}

      <StatRow>
        <StatCard label="Granted records" value={loadingFirst ? "…" : view.granted.length} accent />
        <StatCard label="Open requests" value={loadingFirst ? "…" : view.requests.filter((r) => !r.granted).length} />
        <StatCard label="Records provided" value={loadingFirst ? "…" : view.provided.length} />
      </StatRow>

      <div className="mt-7 grid gap-6 lg:grid-cols-[.9fr_1.1fr]">
        {/* ------------------------------------------------ request form */}
        <Card>
          <CardHeader
            title="Request record access"
            description="Audit-only request. Permission still requires the patient's signature."
          />
          <form onSubmit={requestAccess} className="space-y-4 p-5">
            <Field
              label="Patient wallet address"
              hint="The Stellar account (G…) that owns this record."
            >
              <Input
                value={patient}
                onChange={(e) => setPatient(e.target.value)}
                placeholder="GABC…"
                spellCheck={false}
                autoComplete="off"
                className="font-mono text-[13px]"
              />
            </Field>
            <Field
              label="Record ID (SHA-256)"
              hint="The 64-character hexadecimal ID shared by the patient or referral."
            >
              <Input
                value={recordId}
                onChange={(e) => setRecordId(e.target.value)}
                placeholder="8da412aa…"
                spellCheck={false}
                autoComplete="off"
                className="font-mono text-[13px]"
              />
            </Field>
            <div>
              <span className="mb-1.5 block text-[13px] font-medium text-ink">
                Access duration
              </span>
              <div className="grid grid-cols-3 gap-2">
                {DURATIONS.map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setDuration(item.value)}
                    className={`h-9 rounded-lg border text-[13px] font-semibold transition-colors ${
                      duration === item.value
                        ? "border-brand-500 bg-brand-50 text-brand-700"
                        : "border-line-strong text-ink-secondary hover:border-brand-400"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
            <Button type="submit" loading={submitting} emphasis className="w-full">
              <Send className="size-4" />
              Request patient access
            </Button>
          </form>
        </Card>

        <section className="space-y-6">
          {/* ------------------------------------------- sent requests */}
          <Card>
            <CardHeader
              title="Your requests"
              description="Newest first — approved once the patient signs a grant."
            />
            {view.requests.length === 0 ? (
              <EmptyState
                title="No requests yet"
                body="Submit one on the left; it appears here immediately after confirmation."
              />
            ) : (
              <div className="divide-y divide-line">
                {view.requests.map((request) => (
                  <div key={request.eventId} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5">
                    <div className="min-w-0">
                      <p className="font-mono text-[13px] font-semibold text-ink-strong">
                        {shortAddress(request.recordId, 10, 8)}
                      </p>
                      <p className="mt-1 text-xs text-ink-muted">
                        asked until ledger expiry ·{" "}
                        {new Date(request.requestedUntil * 1000).toLocaleDateString()}
                      </p>
                    </div>
                    <StatusPill tone={request.granted ? "success" : "warning"}>
                      {request.granted ? "granted" : "awaiting consent"}
                    </StatusPill>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* ---------------------------------------- granted records */}
          <Card>
            <CardHeader
              title="Granted to your clinic"
              description="The gateway re-checks these grants before every fetch."
            />
            {loadingFirst ? (
              <div className="space-y-3 p-5">
                <Skeleton className="h-24" />
              </div>
            ) : view.granted.length === 0 ? (
              <EmptyState
                icon="◇"
                title="Waiting for consent"
                body="Records appear here the moment a patient signs a grant in your favor."
              />
            ) : (
              <div className="divide-y divide-line">
                {view.granted.map(({ record, expiresAt }) => (
                  <div key={record.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                    <div className="min-w-0">
                      <p className="font-mono text-[13px] font-semibold text-ink-strong">
                        {shortAddress(record.id, 12, 8)}
                      </p>
                      <p className="mt-1 flex items-center gap-2 text-xs text-ink-muted">
                        provider <AddressChip address={record.provider} link />
                        <ExpiryTimer expiresAt={expiresAt} nowSec={view.nowSec} />
                      </p>
                    </div>
                    <Button
                      variant="secondary"
                      size="sm"
                      loading={verifying === record.id}
                      onClick={() => void verify(record.id)}
                    >
                      <ShieldCheck className="size-3.5" />
                      Verify
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </section>
      </div>

      {/* ---------------------------------------------- provided records */}
      {view.provided.length > 0 ? (
        <section className="mt-6">
          <Card>
            <CardHeader
              title="Records you registered"
              description="Registrations you co-signed as the providing clinician."
            />
            <div className="divide-y divide-line">
              {view.provided.map((record) => (
                <RecordCard
                  key={record.id}
                  id={record.id}
                  provider={record.provider}
                  contentHash={record.contentHash}
                  createdAt={record.createdAt}
                  updatedAt={record.updatedAt}
                  keyVersion={record.keyVersion}
                  nowSec={view.nowSec}
                />
              ))}
            </div>
          </Card>
        </section>
      ) : null}
    </main>
  );
}
