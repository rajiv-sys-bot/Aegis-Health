#!/usr/bin/env node
/**
 * Seeds the two-signature contract calls that the stellar CLI (v26) cannot
 * attach co-signatures for: register_record and submit_claim both require
 * patient AND provider authorization.
 *
 * Usage:
 *   node scripts/seed-multi.mjs register <recordIdHex> <contentHashHex> <locatorHashHex>
 *   node scripts/seed-multi.mjs submit <claimIdHex> <recordIdHex> <amountI128> <insurerG..> <evidenceHashHex>
 *
 * Reads from env:
 *   AEGIS_CONTRACT_ID, AEGIS_RPC_URL, AEGIS_NETWORK_PASSPHRASE,
 *   AEGIS_PATIENT_SECRET, AEGIS_PROVIDER_SECRET
 *
 * Requires compiled bindings first: npm run bindings:build
 */

import { Keypair, Transaction, authorizeEntry, rpc } from "@stellar/stellar-sdk";

const {
  AEGIS_CONTRACT_ID,
  AEGIS_RPC_URL = "https://soroban-testnet.stellar.org",
  AEGIS_NETWORK_PASSPHRASE = "Test SDF Network ; September 2015",
  AEGIS_PATIENT_SECRET,
  AEGIS_PROVIDER_SECRET,
} = process.env;

for (const [k, v] of Object.entries({
  AEGIS_CONTRACT_ID,
  AEGIS_PATIENT_SECRET,
  AEGIS_PROVIDER_SECRET,
})) {
  if (!v) {
    console.error(`Missing env ${k}`);
    process.exit(1);
  }
}

const patientKp = Keypair.fromSecret(AEGIS_PATIENT_SECRET);
const providerKp = Keypair.fromSecret(AEGIS_PROVIDER_SECRET);

const { Client } = await import(
  new URL("../lib/medical-contract/dist/index.js", import.meta.url).href
);

const client = new Client({
  contractId: AEGIS_CONTRACT_ID,
  rpcUrl: AEGIS_RPC_URL,
  networkPassphrase: AEGIS_NETWORK_PASSPHRASE,
  publicKey: patientKp.publicKey(),
});
const server = new rpc.Server(AEGIS_RPC_URL);

const buf32 = (hex) => Buffer.from(hex.replace(/^0x/, ""), "hex");

/** Sign the transaction envelope with a local Keypair (no Freighter headless). */
const envelopeSigner = (kp) => async (xdr) => {
  const tx = new Transaction(xdr, AEGIS_NETWORK_PASSPHRASE);
  tx.sign(kp);
  return { signedTxXdr: tx.toXDR() };
};

/** Build + simulate, co-sign non-invoker auth entries as provider, send as patient. */
async function sendTwoSig(fn, args) {
  const tx = await client[fn](args, { simulate: true });
  // Soroban rejects auth signatures with an expiration too far in the
  // future. Keep the non-invoker signature valid for the next ~10 minutes.
  const latestLedger = (await server.getLatestLedger()).sequence;
  const expirationLedger = latestLedger + 1_000;
  await tx.signAuthEntries({
    address: providerKp.publicKey(),
    authorizeEntry: (entry) =>
      authorizeEntry(entry, providerKp, expirationLedger, AEGIS_NETWORK_PASSPHRASE),
  });
  const sent = await tx.signAndSend({ signTransaction: envelopeSigner(patientKp) });
  // sendTransaction returns PENDING when accepted by RPC. signAndSend then
  // polls getTransaction; inspect that finalized response for the real result.
  const response = sent.getTransactionResponse;
  if (!response || response.status !== "SUCCESS") {
    const result = response?.resultXdr?.result?.().name ?? "unknown result";
    const diagnostics = response?.diagnosticEventsXdr?.length
      ? `; diagnostics: ${response.diagnosticEventsXdr.length}`
      : "";
    throw new Error(
      `${fn} reverted on-chain (${response?.status ?? "UNKNOWN"}; ${result}${diagnostics}; tx ${response?.txHash ?? "unknown"})`,
    );
  }
  console.log(sent.sendTransactionResponse?.hash ?? "ok");
}

const [action, a, b, c, d, e] = process.argv.slice(2);

if (action === "register") {
  // register <recordId> <contentHash> <locatorHash>
  await sendTwoSig("register_record", {
    patient: patientKp.publicKey(),
    provider: providerKp.publicKey(),
    record_id: buf32(a),
    content_hash: buf32(b),
    locator_hash: buf32(c),
  });
} else if (action === "submit") {
  // submit <claimId> <recordId> <amount> <insurer> <evidenceHash>
  await sendTwoSig("submit_claim", {
    patient: patientKp.publicKey(),
    provider: providerKp.publicKey(),
    insurer: d,
    claim_id: buf32(a),
    record_id: buf32(b),
    amount: BigInt(c),
    evidence_hash: buf32(e),
  });
} else {
  console.error(
    "usage: seed-multi.mjs register <recordId> <contentHash> <locatorHash>\n" +
    "       seed-multi.mjs submit <claimId> <recordId> <amount> <insurer> <evidenceHash>",
  );
  process.exit(1);
}
