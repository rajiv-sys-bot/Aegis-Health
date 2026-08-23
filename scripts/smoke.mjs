#!/usr/bin/env node
/**
 * Post-deploy smoke test. Run via `npm run smoke` (which compiles the TS
 * bindings first). Verifies, in order:
 *
 *   1. .env.local exists and NEXT_PUBLIC_CONTRACT_ID looks like a C… id
 *   2. generated contract bindings import cleanly
 *   3. Soroban RPC is reachable (getLatestLedger)
 *   4. the deployed contract answers an admin() read
 *
 * Exit code 0 = all green; 1 = something needs attention (message printed).
 *
 * Optional: AEGIS_SMOKE_SKIP_NETWORK=1 checks config only (offline CI).
 */

import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const ENV_FILE = `${ROOT}.env.local`;

let failures = 0;
const ok = (label, detail = "") =>
  console.log(`  \x1b[32m✓\x1b[0m ${label}${detail ? ` — ${detail}` : ""}`);
const fail = (label, detail = "") => {
  failures += 1;
  console.error(`  \x1b[31m✗\x1b[0m ${label}${detail ? ` — ${detail}` : ""}`);
};

/** Minimal .env parser — KEY=VALUE lines, # comments, optional quotes. */
function loadEnvFile(path) {
  const vars = {};
  if (!existsSync(path)) return vars;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    vars[key] = value;
  }
  return vars;
}

console.log("\nAegis Health — smoke test\n");

// ---------------------------------------------------------------------------
// 1. Configuration
// ---------------------------------------------------------------------------
const env = { ...loadEnvFile(ENV_FILE), ...process.env };
const contractId = env.NEXT_PUBLIC_CONTRACT_ID ?? "";
const rpcUrl =
  env.NEXT_PUBLIC_RPC_URL ?? "https://soroban-testnet.stellar.org";

if (!contractId) {
  fail(
    "config",
    `NEXT_PUBLIC_CONTRACT_ID missing in ${ENV_FILE} — run "npm run setup" first`,
  );
  process.exit(1);
}
if (!/^C[A-Z0-9]{55}$/.test(contractId)) {
  fail("config", `${contractId} is not a valid contract id (expected C…, 56 chars)`);
  process.exit(1);
}
ok("config", `contract ${contractId.slice(0, 10)}…${contractId.slice(-6)}`);

if (process.env.AEGIS_SMOKE_SKIP_NETWORK === "1") {
  console.log("\nOffline mode — skipping network checks.\n");
  process.exit(failures === 0 ? 0 : 1);
}

// ---------------------------------------------------------------------------
// 2. Bindings import (compiled by the wrapping npm script)
// ---------------------------------------------------------------------------
let Client;
try {
  ({ Client } = await import(
    new URL("../lib/medical-contract/dist/index.js", import.meta.url).href
  ));
  ok("bindings", "lib/medical-contract/dist imported");
} catch {
  fail(
    "bindings",
    'could not import lib/medical-contract/dist — run "npm run bindings:build"',
  );
  process.exit(1);
}

// ---------------------------------------------------------------------------
// 3. RPC reachable
// ---------------------------------------------------------------------------
const { rpc, Networks } = await import("@stellar/stellar-sdk");

async function main() {
  let server;
  try {
    server = new rpc.Server(rpcUrl, {
      allowHttp: rpcUrl.startsWith("http://"),
    });
    const latest = await server.getLatestLedger();
    ok("rpc", `${rpcUrl} · ledger #${latest.sequence}`);
  } catch (e) {
    fail(
      "rpc",
      `${rpcUrl} unreachable (${e instanceof Error ? e.message : String(e)})`,
    );
    return;
  }

  // -------------------------------------------------------------------------
  // 4. Contract answers a read
  // -------------------------------------------------------------------------
  try {
    const client = new Client({
      contractId,
      rpcUrl,
      networkPassphrase: Networks.TESTNET,
    });
    const tx = await client.admin();
    if (!tx.result || tx.result.isErr()) {
      fail(
        "contract",
        "admin() returned Err — contract deployed but not initialized; re-run setup",
      );
      return;
    }
    ok("contract", `initialized, admin ${tx.result.unwrap().slice(0, 8)}…`);
  } catch (e) {
    fail(
      "contract",
      `${contractId.slice(0, 12)}… did not answer (${e instanceof Error ? e.message : String(e)})`,
    );
  }
}

await main();

console.log("");
if (failures > 0) {
  console.error(`${failures} check${failures === 1 ? "" : "s"} failed.\n`);
  process.exit(1);
}
console.log("All checks passed — the deployment is live.\n");
