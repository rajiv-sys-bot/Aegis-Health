"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ClipboardList,
  FileClock,
  HeartPulse,
  Shield,
  Stethoscope,
  UserCog,
} from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { NetworkWarningChip, WalletConnectButton } from "@/components/wallet-connect-button";
import { useWallet } from "@/components/wallet-provider";
import { useRole } from "@/hooks/use-views";
import { cn } from "@/components/health-ui";

const NAVIGATION = [
  { href: "/dashboard/patient", label: "My records", icon: HeartPulse },
  { href: "/dashboard/doctor", label: "Clinic", icon: Stethoscope },
  { href: "/claims", label: "Claims", icon: ClipboardList },
  { href: "/audit", label: "Audit log", icon: FileClock },
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLanding = pathname === "/";
  const { address } = useWallet();
  const { isAdmin } = useRole(address);

  // Admin console only appears for the contract admin.
  const navigation = isAdmin
    ? [
        ...NAVIGATION,
        { href: "/dashboard/admin", label: "Admin", icon: UserCog },
      ]
    : [...NAVIGATION];

  return (
    <div className="min-h-screen">
      <header
        className={cn(
          "sticky top-0 z-40 border-b backdrop-blur-xl",
          isLanding ? "border-white/10 bg-brand-900/95" : "border-line bg-surface/85",
        )}
      >
        <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
          <Link href="/" aria-label="Aegis Health home">
            <BrandMark inverted={isLanding} />
          </Link>

          {!isLanding && (
            <>
              <nav
                className="hidden items-center gap-1 md:flex"
                aria-label="Main navigation"
              >
                {navigation.map(({ href, label, icon: Icon }) => {
                  const active = pathname.startsWith(href);
                  return (
                    <Link
                      key={href}
                      href={href}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "inline-flex h-9 items-center gap-2 rounded-full px-3.5 text-sm font-semibold transition-colors",
                        active
                          ? "bg-brand-50 text-brand-700"
                          : "text-ink-secondary hover:bg-surface-muted hover:text-ink",
                      )}
                    >
                      <Icon className="size-4" />
                      {label}
                    </Link>
                  );
                })}
              </nav>
              <NetworkWarningChip />
            </>
          )}

          <div className="flex items-center gap-2">
            {!isLanding && (
              <span className="hidden items-center gap-1.5 rounded-full border border-line bg-surface-muted px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-ink-secondary sm:inline-flex">
                <span aria-hidden className="size-1.5 rounded-full bg-success" />
                Testnet
              </span>
            )}
            <WalletConnectButton />
          </div>
        </div>
      </header>

      {children}

      {!isLanding && (
        <nav
          className="fixed inset-x-3 bottom-3 z-50 grid grid-cols-4 rounded-2xl border border-line bg-surface/95 p-1.5 shadow-pop backdrop-blur md:hidden"
          aria-label="Mobile navigation"
        >
          {(isAdmin ? navigation.slice(-4) : navigation).map(
            ({ href, label, icon: Icon }) => {
              const active = pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl text-[10px] font-bold",
                    active ? "bg-brand-50 text-brand-700" : "text-ink-muted",
                  )}
                >
                  <Icon className="size-4" />
                  {label}
                </Link>
              );
            },
          )}
        </nav>
      )}

      {!isLanding && (
        <div className="fixed bottom-20 right-4 hidden items-center gap-2 rounded-full border border-line bg-surface px-3 py-2 text-[11px] font-semibold text-ink-secondary shadow-card lg:flex">
          <Shield className="size-3.5 text-brand-600" />
          Contract secured on Soroban
        </div>
      )}
    </div>
  );
}
