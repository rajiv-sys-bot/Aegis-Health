#!/usr/bin/env node
/**
 * Prepare named Testnet wallets as Providers, then run five unique provider
 * transactions per invocation.
 *
 * Input files stay outside the repository:
 *   /Users/rajivdubey/Documents/Coding/notes/user.md
 *   /Users/rajivdubey/Documents/Coding/notes/Stellar_wallets.md
 *
 * Pairing rule: named users and wallets pair by document order. The notes
 * currently contain 50 names and 60 wallets; all 60 receive Provider role,
 * while the first 50 are eligible for named test batches.
 */

import fs from "node:fs";
import path from "node:path";
import { randomBytes, randomInt } from "node:crypto";
import { Keypair, Transaction, rpc, scValToNative } from "@stellar/stellar-sdk";

const { Client } = await import(
  new URL("../lib/medical-contract/dist/index.js", import.meta.url).href,
);

const ROOT = path.resolve(new URL("..", import.meta.url).pathname);
const NOTES_DIR = "/Users/rajivdubey/Documents/Coding/notes";
const USERS_FILE = path.join(NOTES_DIR, "user.md");
const WALLETS_FILE = path.join(NOTES_DIR, "Stellar_wallets.md");
const STATE_FILE = path.join(ROOT, "scripts", "provider-test-ledger.local.json");
const ENV_FILE = path.join(ROOT, ".env.local");
const ACCOUNTS_FILE = path.join(ROOT, "scripts", "aegis-accounts.local.env");
const NETWORK_PASSPHRASE = "Test SDF Network ; September 2015";

function requiredFile(file) {
  if (!fs.existsSync(file)) throw new Error(`Missing required file: ${file}`);
  return fs.readFileSync(file, "utf8");
}

function envValue(text, key) {
  const match = text.match(new RegExp(`^${key}=(.+)$`, "m"));
  return match?.[1]?.trim() ?? "";
}

function loadConfig() {
  const env = requiredFile(ENV_FILE);
  const accounts = requiredFile(ACCOUNTS_FILE);
  const contractId = envValue(env, "NEXT_PUBLIC_CONTRACT_ID");
  const rpcUrl = envValue(env, "NEXT_PUBLIC_RPC_URL") || "https://soroban-testnet.stellar.org";
  const adminSecret = envValue(accounts, "AEGIS_ADMIN_SECRET");
  const patient = envValue(env, "NEXT_PUBLIC_DEMO_PATIENT");
  if (!contractId || !adminSecret || !patient) {
    throw new Error("Missing contract, admin secret, or demo patient in generated config.");
  }
  return { contractId, rpcUrl, adminSecret, patient };
}

function parseUsers() {
  return requiredFile(USERS_FILE)
    .split("\n")
    .filter((line) => /^\|[^|]+\|[^|]+\|$/.test(line.trim()))
    .filter((line) => !line.includes("Name") && !line.includes("---"))
    .map((line) => {
      const [, name, email] = line.split("|").map((part) => part.trim());
      return { name, email };
    });
}

function parseWallets() {
  const wallets = [];
  let address = "";
  for (const line of requiredFile(WALLETS_FILE).split("\n")) {
    const addressMatch = line.match(/\|\s*(G[A-Z2-7]{55})\s*\|/);
    if (addressMatch) address = addressMatch[1];
    const secretMatch = line.match(/\|\s*(S[A-Z2-9]{55})\s*\|/);
    if (secretMatch && address) {
      wallets.push({ address, secret: secretMatch[1] });
      address = "";
    }
  }
  return wallets;
}

function loadState() {
  if (!fs.existsSync(STATE_FILE)) return { used: [], roleTxs: {} };
  return JSON.parse(fs.readFileSync(STATE_FILE, "utf8"));
}

function saveState(state) {
  fs.writeFileSync(STATE_FILE, `${JSON.stringify(state, null, 2)}\n`, { mode: 0o600 });
}

function signer(keypair) {
  return async (xdr) => {
    const tx = new Transaction(xdr, NETWORK_PASSPHRASE);
    tx.sign(keypair);
    return { signedTxXdr: tx.toXDR() };
  };
}

function clientFor({ contractId, rpcUrl }, keypair) {
  return new Client({
    contractId,
    rpcUrl,
    networkPassphrase: NETWORK_PASSPHRASE,
    publicKey: keypair.publicKey(),
    signTransaction: signer(keypair),
  });
}

async function send(client, method, args) {
  const tx = await client[method](args);
  const sent = await tx.signAndSend();
  const response = sent.getTransactionResponse;
  if (!response || response.status !== "SUCCESS") {
    throw new Error(`${method} failed (${response?.status ?? "UNKNOWN"})`);
  }
  return sent.sendTransactionResponse?.hash ?? response.txHash;
}

async function findDemoRecord(config, server) {
  const latest = await server.getLatestLedger();
  const response = await server.getEvents({
    filters: [{ type: "contract", contractIds: [config.contractId], topics: [] }],
    startLedger: latest.sequence - 8_640,
    limit: 200,
  });
  for (const event of response.events) {
    if (scValToNative(event.topic?.[0]) !== "record_registered") continue;
    const record = scValToNative(event.topic?.[2]);
    if (record instanceof Uint8Array || Buffer.isBuffer(record)) {
      return Buffer.from(record).toString("hex");
    }
  }
  return null;
}

function testHash() {
  return randomBytes(32);
}

async function main() {
  const config = loadConfig();
  const users = parseUsers();
  const wallets = parseWallets();
  if (users.length !== 50 || wallets.length !== 60) {
    throw new Error(`Expected 50 users + 60 wallets; found ${users.length} + ${wallets.length}.`);
  }

  const named = users.map((user, index) => ({ ...user, ...wallets[index] }));
  const extraWallets = wallets.slice(users.length);
  const state = loadState();
  const used = new Set(state.used);
  const admin = Keypair.fromSecret(config.adminSecret);
  const adminClient = clientFor(config, admin);
  const server = new rpc.Server(config.rpcUrl);

  console.log(`Provider preparation: ${wallets.length} wallets`);
  for (const wallet of wallets) {
    const roleTx = state.roleTxs[wallet.address];
    if (roleTx) continue;
    const roleResult = await adminClient.role_of({ account: wallet.address });
    if (roleResult.result?.tag === "Provider") {
      state.roleTxs[wallet.address] = "already-provider";
      continue;
    }
    const hash = await send(adminClient, "set_role", {
      account: wallet.address,
      role: { tag: "Provider", values: undefined },
      enabled: true,
    });
    state.roleTxs[wallet.address] = hash;
    saveState(state);
    console.log(`Provider role set: ${wallet.address} · ${hash}`);
  }

  const available = named.filter((user) => !used.has(user.email) && !used.has(user.address));
  if (available.length < 5) {
    throw new Error(`Only ${available.length} named unused testers remain; need 5.`);
  }
  const selected = [];
  while (selected.length < 5) {
    const candidate = available.splice(randomInt(available.length), 1)[0];
    selected.push(candidate);
  }

  const recordId = await findDemoRecord(config, server);
  const requestedUntil = BigInt(Math.floor(Date.now() / 1000) + 86_400);
  const results = [];
  for (const tester of selected) {
    const keypair = Keypair.fromSecret(tester.secret);
    let hash;
    let action;
    let exercisedRecordId = recordId;
    if (recordId) {
      action = "request_access";
      hash = await send(clientFor(config, keypair), action, {
        requester: tester.address,
        record_id: Buffer.from(recordId, "hex"),
        requested_until: requestedUntil,
      });
    } else {
      // A request_access call requires an existing record. If this contract
      // was deployed with an external patient, setup intentionally created no
      // records, so register a self-owned synthetic test record instead.
      action = "register_record";
      const recordBytes = testHash();
      exercisedRecordId = recordBytes.toString("hex");
      hash = await send(clientFor(config, keypair), action, {
        patient: tester.address,
        provider: tester.address,
        record_id: recordBytes,
        content_hash: testHash(),
        locator_hash: testHash(),
      });
    }
    used.add(tester.email);
    used.add(tester.address);
    state.used = [...used];
    state.batches ??= [];
    state.batches.push({
      ...tester,
      action,
      txHash: hash,
      recordId: exercisedRecordId,
      at: new Date().toISOString(),
    });
    saveState(state);
    results.push({
      name: tester.name,
      email: tester.email,
      wallet: tester.address,
      action,
      txHash: hash,
    });
  }

  console.log(`\nCompleted batch: ${results.length} provider transactions`);
  for (const result of results) {
    console.log(
      `${result.name} | ${result.email} | ${result.wallet} | ${result.action} | ${result.txHash}`,
    );
  }
  console.log(`\nRemaining named testers: ${named.length - used.size / 2}`);
  console.log(`Extra provider-only wallets: ${extraWallets.length}`);
}

main().catch((error) => {
  console.error(`\nFAILED: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
