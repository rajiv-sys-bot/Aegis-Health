"use client";

/**
 * Admin console — visible in navigation only to the contract admin, and
 * guarded again here for direct URL access. Role changes and admin transfers
 * are ordinary contract calls signed with the admin wallet.
 */

import { FormEvent, useState } from "react";
import { UserCog } from "lucide-react";
import { useWallet } from "@/components/wallet-provider";
import { useToast } from "@/components/toast";
import {
  AddressChip,
  Banner,
  Button,
  Card,
  CardHeader,
  EmptyState,
  ErrorState,
  Field,
  Input,
  PageHeader,
  RelativeTime,
  Select,
  Skeleton,
} from "@/components/health-ui";
import { useRole, useRoleRegistry } from "@/hooks/use-views";
import { useNow } from "@/hooks/use-async";
import { describeTxError, runWrite } from "@/lib/stellar";

type RoleName = "Provider" | "Insurer";

export default function AdminDashboard() {
  const { address, connect } = useWallet();
  const { isAdmin, loading: roleLoading } = useRole(address);
  const registry = useRoleRegistry();
  const toast = useToast();
  const nowSec = useNow(30);

  const [roleAccount, setRoleAccount] = useState("");
  const [roleName, setRoleName] = useState<RoleName>("Provider");
  const [busyRole, setBusyRole] = useState(false);

  const [adminAccount, setAdminAccount] = useState("");
  const [busyTransfer, setBusyTransfer] = useState(false);

  const short = (value: string) => `${value.slice(0, 6)}…${value.slice(-4)}`;

  if (!address) {
    return (
      <main className="mx-auto max-w-7xl px-4 pt-10 sm:px-6 lg:px-8">
        <PageHeader
          eyebrow="Admin"
          title="Connect the admin wallet"
          description="Role management is reserved for the contract administrator."
        />
        <Card>
          <EmptyState
            icon="🔑"
            title="No wallet connected"
            body="Connect Freighter with the seeded admin account to manage roles."
            action={
              <Button onClick={() => void connect()}>Connect wallet</Button>
            }
          />
        </Card>
      </main>
    );
  }

  if (roleLoading) {
    return (
      <main className="mx-auto max-w-7xl px-4 pt-10 sm:px-6 lg:px-8">
        <PageHeader eyebrow="Admin" title="Checking your role…" />
        <Skeleton className="h-40" />
      </main>
    );
  }

  if (!isAdmin) {
    return (
      <main className="mx-auto max-w-7xl px-4 pt-10 sm:px-6 lg:px-8">
        <PageHeader eyebrow="Admin" title="Not an admin" />
        <Card>
          <EmptyState
            icon="✕"
            title="This account can't manage roles"
            body={`The connected wallet ${address.slice(0, 8)}… is not the contract admin.`}
          />
        </Card>
      </main>
    );
  }

  const setRole = async (enabled: boolean) => {
    setBusyRole(true);
    const pending = toast.push({
      tone: "pending",
      message: `Confirm the role change in Freighter…`,
    });
    try {
      // Unit enum → bindings expect the tagged form.
      await runWrite(address, (client) =>
        client.set_role({
          account: roleAccount.trim().toUpperCase(),
          role: { tag: roleName, values: undefined },
          enabled,
        }),
      );
      toast.push({
        tone: "success",
        message: `${roleName} role ${enabled ? "granted to" : "revoked from"} ${short(roleAccount)}.`,
        id: pending,
      });
      setRoleAccount("");
      registry.refresh();
    } catch (e) {
      toast.push({ tone: "error", message: describeTxError(e), id: pending });
    } finally {
      setBusyRole(false);
    }
  };

  const transferAdmin = async (event: FormEvent) => {
    event.preventDefault();
    if (!/^G[A-Z2-7]{55}$/.test(adminAccount.trim().toUpperCase())) {
      toast.push({ tone: "error", message: "Enter a valid Stellar account (G…)." });
      return;
    }
    if (
      !window.confirm(
        `Transfer contract admin to ${short(adminAccount)}? You lose admin rights immediately.`,
      )
    ) {
      return;
    }
    setBusyTransfer(true);
    const pending = toast.push({
      tone: "pending",
      message: "Confirm the admin transfer in Freighter…",
    });
    try {
      await runWrite(address, (client) =>
        client.transfer_admin({ new_admin: adminAccount.trim().toUpperCase() }),
      );
      toast.push({
        tone: "success",
        message: "Admin transferred. This page will lock on next load.",
        id: pending,
      });
      setAdminAccount("");
    } catch (e) {
      toast.push({ tone: "error", message: describeTxError(e), id: pending });
    } finally {
      setBusyTransfer(false);
    }
  };

  return (
    <main className="mx-auto max-w-7xl px-4 pt-8 pb-28 sm:px-6 sm:pt-10 lg:px-8">
      <PageHeader
        eyebrow="Admin"
        title="Role registry"
        description="Providers register records; insurers underwrite claims. Every assignment is an on-chain event."
      />

      {registry.error ? (
        <div className="mb-5">
          <ErrorState message={registry.error} onRetry={registry.refresh} />
        </div>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-[1.2fr_.8fr]">
        <section>
          <Card>
            <CardHeader
              title={`${registry.roles.length} known account${registry.roles.length === 1 ? "" : "s"}`}
              description="Latest role_changed event per account, newest first."
              actions={
                <Button variant="ghost" size="sm" onClick={registry.refresh}>
                  Refresh
                </Button>
              }
            />
            {registry.loading && registry.roles.length === 0 ? (
              <div className="space-y-3 p-5">
                <Skeleton className="h-10" />
                <Skeleton className="h-10" />
              </div>
            ) : registry.roles.length === 0 ? (
              <EmptyState
                title="No roles assigned yet"
                body='Grant the first role below — the seeded demo assigns Provider + Insurer during "npm run setup".'
              />
            ) : (
              <div className="divide-y divide-line">
                {registry.roles.map((assignment) => (
                  <div
                    key={assignment.account}
                    className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5"
                  >
                    <div className="min-w-0">
                      <AddressChip address={assignment.account} link />
                      <p className="mt-1 text-xs text-ink-muted">
                        updated{" "}
                        <RelativeTime
                          epochSec={Math.floor(new Date(assignment.closedAt).getTime() / 1000)}
                          nowSec={nowSec}
                        />
                      </p>
                    </div>
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${
                        assignment.enabled
                          ? "border-success/25 bg-success-soft text-success"
                          : "border-line bg-surface-muted text-ink-muted line-through"
                      }`}
                    >
                      {assignment.role}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </section>

        <section className="space-y-5">
          <Card>
            <CardHeader
              title="Assign a role"
              description="Grant or revoke a provider / insurer role."
            />
            <form
              className="space-y-4 p-5"
              onSubmit={(e) => {
                e.preventDefault();
                void setRole(true);
              }}
            >
              <Field label="Account" hint="Stellar account (G…) receiving the role.">
                <Input
                  value={roleAccount}
                  onChange={(e) => setRoleAccount(e.target.value)}
                  placeholder="GABC…"
                  spellCheck={false}
                  autoComplete="off"
                  className="font-mono text-[13px]"
                />
              </Field>
              <Field label="Role">
                <Select value={roleName} onChange={(e) => setRoleName(e.target.value as RoleName)}>
                  <option value="Provider">Provider</option>
                  <option value="Insurer">Insurer</option>
                </Select>
              </Field>
              <div className="flex items-center gap-2">
                <Button type="submit" loading={busyRole} disabled={!roleAccount.trim()}>
                  Grant
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={busyRole || !roleAccount.trim()}
                  onClick={() => void setRole(false)}
                >
                  Revoke
                </Button>
              </div>
            </form>
          </Card>

          <Card>
            <CardHeader
              title="Danger zone"
              description="Transferring admin is irreversible."
            />
            <form className="space-y-4 p-5" onSubmit={(e) => void transferAdmin(e)}>
              <Field label="New admin" hint="Double-check — there is no undo.">
                <Input
                  value={adminAccount}
                  onChange={(e) => setAdminAccount(e.target.value)}
                  placeholder="GABC…"
                  spellCheck={false}
                  autoComplete="off"
                  className="font-mono text-[13px]"
                />
              </Field>
              <Button
                type="submit"
                variant="danger"
                loading={busyTransfer}
                disabled={!adminAccount.trim()}
              >
                Transfer admin
              </Button>
            </form>
            <div className="px-5 pb-5">
              <Banner tone="warning">
                The transfer takes effect as soon as the transaction confirms.
              </Banner>
            </div>
          </Card>
        </section>
      </div>

      <p className="mt-8 flex items-center gap-2 text-xs font-medium text-ink-muted">
        <UserCog className="size-4 text-brand-600" />
        Roles gate who may call privileged entry points — they never grant
        access to record contents.
      </p>
    </main>
  );
}
