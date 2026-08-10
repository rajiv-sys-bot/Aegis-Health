/**
 * Single source of truth for chain connectivity.
 *
 * Values come from NEXT_PUBLIC_* env vars (see .env.example). `npm run setup`
 * writes .env.local after deploying + seeding the contract. Validation is
 * lazy (assertConfig) so `next build` and CI never fail on a missing env —
 * the app renders an "unconfigured" state instead of throwing at import time.
 */

export const CONTRACT_ID = process.env.NEXT_PUBLIC_CONTRACT_ID ?? "";
export const RPC_URL =
  process.env.NEXT_PUBLIC_RPC_URL ?? "https://soroban-testnet.stellar.org";
export const TOKEN_ID = process.env.NEXT_PUBLIC_TOKEN_ID ?? "";
export const EXPLORER_URL = "https://stellar.expert/explorer/testnet";

/** Pubkeys of the seeded demo accounts (written by scripts/setup.sh). */
export const DEMO_ACCOUNTS = {
  admin: process.env.NEXT_PUBLIC_DEMO_ADMIN ?? "",
  patient: process.env.NEXT_PUBLIC_DEMO_PATIENT ?? "",
  provider: process.env.NEXT_PUBLIC_DEMO_PROVIDER ?? "",
  insurer: process.env.NEXT_PUBLIC_DEMO_INSURER ?? "",
} as const;

const CONTRACT_ID_PATTERN = /^C[A-Z0-9]{55}$/;

export type ConfigStatus = {
  ok: boolean;
  problems: string[];
  contractConfigured: boolean;
};

export function validateConfig(): ConfigStatus {
  const problems: string[] = [];
  if (!CONTRACT_ID) {
    problems.push(
      "NEXT_PUBLIC_CONTRACT_ID is not set. Run `npm run setup` to deploy and seed the contract, or copy .env.example to .env.local.",
    );
  } else if (!CONTRACT_ID_PATTERN.test(CONTRACT_ID)) {
    problems.push(
      "NEXT_PUBLIC_CONTRACT_ID is not a valid Soroban contract id (expected C…, 56 characters).",
    );
  }
  try {
    new URL(RPC_URL);
  } catch {
    problems.push("NEXT_PUBLIC_RPC_URL is not a valid URL.");
  }
  return {
    ok: problems.length === 0,
    problems,
    contractConfigured: CONTRACT_ID_PATTERN.test(CONTRACT_ID),
  };
}

/** Throws with every problem listed — call from data-loading paths only. */
export function assertConfig(): void {
  const { ok, problems } = validateConfig();
  if (!ok) throw new Error(problems.join(" "));
}

/** "CAJFUAIF…7PMZG" for display; empty string when unconfigured. */
export function shortContractId(): string {
  if (!CONTRACT_ID) return "";
  return `${CONTRACT_ID.slice(0, 10)}…${CONTRACT_ID.slice(-6)}`;
}
