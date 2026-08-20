"use client";

/**
 * Audit log — every consent, record and claim event this contract emitted in
 * the retention window, searchable and exportable. Rows link to Stellar
 * Expert so each line is verifiable on-ledger.
 */

import { useMemo, useState } from "react";
import { Download, ShieldCheck } from "lucide-react";
import { useToast } from "@/components/toast";
import {
  AddressChip,
  Button,
  Card,
  CardHeader,
  EmptyState,
  ErrorState,
  Input,
  PageHeader,
  RelativeTime,
  Select,
  Skeleton,
} from "@/components/health-ui";
import { useAuditFeed } from "@/hooks/use-views";
import { useNow } from "@/hooks/use-async";
import { EXPLORER_URL } from "@/lib/stellar-config";
import type { DecodedEvent } from "@/lib/events";
import { formatAmount, shortAddress, toCsv } from "@/lib/format";
import { describeActivity } from "@/lib/event-reducers";

/** One-line human context for an event row. */
function eventDetail(e: DecodedEvent): string {
  const who = e.accounts[1] ? shortAddress(e.accounts[1], 6, 6) : "";
  const what = e.recordIds[0] ? shortAddress(e.recordIds[0], 8, 6) : "";
  switch (e.name) {
    case "record_registered":
      return `provider ${shortAddress(e.fields.provider ?? "", 6, 6)}${what ? ` · ${what}` : ""}`;
    case "record_rotated":
      return `key v${e.fields.key_version ?? "?"} · ${what}`;
    case "access_granted":
      return `${who} granted on ${what}`;
    case "access_revoked":
      return `${who} revoked on ${what}`;
    case "access_requested":
      return `${who} asked for ${what}`;
    case "policy_set":
      return `${formatAmount(e.fields.max_per_claim ?? "0")} max per claim`;
    case "claim_submitted":
    case "claim_approved":
    case "claim_paid":
      return `${formatAmount(e.fields.amount || "0")}${who ? ` · ${who}` : ""}`;
    default:
      return [who, what].filter(Boolean).join(" · ") || "—";
  }
}

const PAGE_SIZE = 50;

export default function AuditPage() {
  const feed = useAuditFeed();
  const nowSec = useNow(30);
  const toast = useToast();
  const [query, setQuery] = useState("");
  const [eventType, setEventType] = useState("all");

  const types = useMemo(
    () => [...new Set(feed.events.map((e) => e.name))].sort(),
    [feed.events],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return feed.events.filter((e) => {
      if (eventType !== "all" && e.name !== eventType) return false;
      if (!q) return true;
      return (
        e.name.includes(q) ||
        e.txHash.toLowerCase().includes(q) ||
        e.accounts.some((a) => a.toLowerCase().includes(q)) ||
        e.recordIds.some((r) => r.toLowerCase().includes(q))
      );
    });
  }, [feed.events, query, eventType]);

  // CSV of the current filter result — quoted via toCsv.
  const exportCsv = () => {
    try {
      const csv = toCsv(
        ["event", "actor", "detail", "ledger", "closed_at", "tx_hash"],
        filtered.map((e) => [
          e.name,
          e.actor,
          eventDetail(e),
          e.ledger,
          e.closedAt,
          e.txHash,
        ]),
      );
      const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = `aegis-audit-${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.push({ tone: "error", message: "Could not generate the CSV." });
    }
  };

  return (
    <main className="mx-auto max-w-7xl px-4 pt-8 pb-28 sm:px-6 sm:pt-10 lg:px-8">
      <PageHeader
        eyebrow="Immutable history"
        title="Audit log"
        description="Chronological consent and claim events straight from Soroban RPC — every row links to its final transaction."
        actions={
          <Button variant="secondary" onClick={exportCsv} disabled={filtered.length === 0}>
            <Download className="size-4" />
            Export CSV
          </Button>
        }
      />

      <Card className="mb-4">
        <div className="flex flex-col gap-3 p-3 sm:flex-row">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search actor, record, or transaction hash"
            aria-label="Search events"
            className="sm:max-w-md"
          />
          <Select
            value={eventType}
            onChange={(e) => setEventType(e.target.value)}
            aria-label="Filter by event type"
            className="sm:max-w-56"
          >
            <option value="all">All event types</option>
            {types.map((name) => (
              <option key={name} value={name}>
                {name.replace(/_/g, " ")}
              </option>
            ))}
          </Select>
        </div>
      </Card>

      <section>
        <Card>
          <CardHeader
            title={`${filtered.length} event${filtered.length === 1 ? "" : "s"}`}
            description={
              feed.watermarkIso
                ? `Retention window starts ${new Date(feed.watermarkIso).toLocaleString()}.`
                : "Full history within the RPC retention window."
            }
            actions={
              <Button variant="ghost" size="sm" onClick={feed.refresh}>
                Refresh
              </Button>
            }
          />
          {feed.error ? (
            <ErrorState message={feed.error} onRetry={feed.refresh} />
          ) : feed.loading && feed.events.length === 0 ? (
            <div className="space-y-3 p-5">
              <Skeleton className="h-10" />
              <Skeleton className="h-10" />
              <Skeleton className="h-10" />
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState
              icon="◇"
              title="No matching events"
              body={
                feed.events.length === 0
                  ? 'No contract activity yet — run "npm run setup" to seed the demo.'
                  : "Try a different search term or event type."
              }
            />
          ) : (
            <>
              <div className="divide-y divide-line">
                {filtered.slice(0, PAGE_SIZE).map((event) => (
                  <div
                    key={event.id}
                    className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2 px-5 py-3"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[13px] font-semibold text-ink-strong">
                          {describeActivity(event)}
                        </span>
                        <span className="rounded-full border border-line bg-surface-muted px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-ink-secondary">
                          {event.name.replace(/_/g, " ")}
                        </span>
                      </div>
                      <p className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-ink-muted">
                        {eventDetail(event)}
                        {event.actor ? (
                          <>
                            · actor <AddressChip address={event.actor} link />
                          </>
                        ) : null}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-0.5">
                      <RelativeTime epochSec={Math.floor(new Date(event.closedAt).getTime() / 1000)} nowSec={nowSec} />
                      <a
                        href={`${EXPLORER_URL}/tx/${event.txHash}`}
                        target="_blank"
                        rel="noreferrer"
                        className="font-mono text-[12px] text-ink-muted hover:text-brand-700"
                      >
                        {shortAddress(event.txHash, 4, 4)} ↗
                      </a>
                    </div>
                  </div>
                ))}
              </div>
              {filtered.length > PAGE_SIZE ? (
                <p className="border-t border-line px-5 py-3 text-xs text-ink-muted">
                  Showing the newest {PAGE_SIZE} of {filtered.length} — narrow
                  with search or export the full set as CSV.
                </p>
              ) : null}
            </>
          )}
        </Card>
      </section>

      <p className="mt-6 flex items-center gap-2 text-xs font-medium text-ink-muted">
        <ShieldCheck className="size-4 text-brand-600" />
        Events are read directly from Soroban RPC; links resolve against the
        Stellar testnet explorer.
      </p>
    </main>
  );
}
