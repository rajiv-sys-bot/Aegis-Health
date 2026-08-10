"use client";

import { Buffer } from "buffer";
import { Networks } from "@stellar/stellar-sdk";
import type {
  AssembledTransaction,
  Result,
} from "@stellar/stellar-sdk/contract";
import { signTransaction } from "@stellar/freighter-api";
import { Client, ContractError } from "@/lib/medical-contract/src";
import { CONTRACT_ID, RPC_URL } from "@/lib/stellar-config";

export const NETWORK_PASSPHRASE = Networks.TESTNET;

/** No-signer client — pure reads against RPC (events hydration, views). */
export function anonymousClient() {
  return new Client({
    contractId: CONTRACT_ID,
    rpcUrl: RPC_URL,
    networkPassphrase: NETWORK_PASSPHRASE,
  });
}

export function contractClient(publicKey: string) {
  return new Client({
    contractId: CONTRACT_ID,
    rpcUrl: RPC_URL,
    networkPassphrase: NETWORK_PASSPHRASE,
    publicKey,
    signTransaction: async (xdr, options) => {
      const response = await signTransaction(xdr, {
        ...options,
        address: publicKey,
        networkPassphrase: NETWORK_PASSPHRASE,
      });
      if (response.error) throw new Error(response.error.message);
      return response;
    },
  });
}

export function hexToBuffer(value: string): Buffer {
  const normalized = value.trim().replace(/^0x/, "");
  if (!/^[0-9a-fA-F]{64}$/.test(normalized)) {
    throw new Error("Expected 64-character SHA-256 hex value.");
  }
  return Buffer.from(normalized, "hex");
}

export function transactionHash(sent: {
  sendTransactionResponse?: { hash?: string };
}): string {
  return sent.sendTransactionResponse?.hash ?? "";
}

/**
 * Build + simulate + sign-in-Freighter + submit a state-changing call.
 * Throws descriptive errors (see describeTxError) — callers catch and toast.
 */
export async function runWrite<T>(
  publicKey: string,
  fn: (
    client: ReturnType<typeof contractClient>,
  ) => Promise<AssembledTransaction<Result<T>>>,
): Promise<{ hash: string }> {
  const client = contractClient(publicKey);
  const tx = await fn(client);
  const sent = await tx.signAndSend();
  const hash = transactionHash(sent);
  if (!hash) throw new Error("The network did not accept the transaction.");
  return { hash };
}

/**
 * Turn any thrown SDK/wallet error into a human sentence. Contract errors
 * arrive as "Error(Contract, #12)" inside the message — translate the code
 * via the generated bindings table.
 */
export function describeTxError(error: unknown): string {
  if (error instanceof Error && error.message) {
    const match = error.message.match(/Error\(Contract,\s*#(\d+)\)/);
    if (match) {
      const entry = (ContractError as Record<string, { message?: string }>)[
        match[1]
      ];
      const name = entry?.message ?? `contract error ${match[1]}`;
      // Split SCREAMING_SNAKE into words for readability.
      return name
        .toLowerCase()
        .split("_")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");
    }
    return error.message;
  }
  return "The transaction failed — check your wallet and network.";
}
