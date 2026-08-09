import { Buffer } from "buffer";
import { Address } from "@stellar/stellar-sdk";
import {
  AssembledTransaction,
  Client as ContractClient,
  ClientOptions as ContractClientOptions,
  MethodOptions,
  Result,
  Spec as ContractSpec,
} from "@stellar/stellar-sdk/contract";
import type {
  u32,
  i32,
  u64,
  i64,
  u128,
  i128,
  u256,
  i256,
  Option,
  Timepoint,
  Duration,
} from "@stellar/stellar-sdk/contract";
export * from "@stellar/stellar-sdk";
export * as contract from "@stellar/stellar-sdk/contract";
export * as rpc from "@stellar/stellar-sdk/rpc";

if (typeof window !== "undefined") {
  //@ts-ignore Buffer exists
  window.Buffer = window.Buffer || Buffer;
}




export type Role = {tag: "Provider", values: void} | {tag: "Insurer", values: void};


export interface Claim {
  amount: i128;
  evidence_hash: Buffer;
  insurer: string;
  patient: string;
  provider: string;
  record_id: Buffer;
  status: ClaimStatus;
  submitted_at: u64;
  token: string;
}


export interface Policy {
  active: boolean;
  insurer: string;
  max_per_claim: i128;
  patient: string;
  token: string;
  valid_until: u64;
}


export interface AccessGrant {
  expires_at: u64;
  granted_at: u64;
  grantee: string;
  /**
 * Commitment to encrypted key envelope delivered off-chain.
 */
key_commitment: Buffer;
  key_version: u32;
  patient: string;
}

export type ClaimStatus = {tag: "Pending", values: void} | {tag: "Approved", values: void} | {tag: "Paid", values: void} | {tag: "Rejected", values: void} | {tag: "Cancelled", values: void};

export const ContractError = {
  1: {message:"AlreadyInitialized"},
  2: {message:"NotInitialized"},
  3: {message:"UnauthorizedRole"},
  4: {message:"RecordAlreadyExists"},
  5: {message:"RecordNotFound"},
  6: {message:"NotRecordOwner"},
  7: {message:"InvalidExpiry"},
  8: {message:"GrantNotFound"},
  9: {message:"PolicyNotFound"},
  10: {message:"PolicyInactive"},
  11: {message:"ClaimAlreadyExists"},
  12: {message:"ClaimNotFound"},
  13: {message:"InvalidClaimState"},
  14: {message:"InvalidAmount"},
  15: {message:"CoverageExceeded"},
  16: {message:"AccessRequired"},
  17: {message:"InvalidRole"}
}


export interface MedicalRecord {
  /**
 * SHA-256 digest of encrypted record bytes.
 */
content_hash: Buffer;
  created_at: u64;
  /**
 * Encryption-key generation. Rotating record invalidates old grants.
 */
key_version: u32;
  /**
 * SHA-256 digest of canonical off-chain locator; locator stays private.
 */
locator_hash: Buffer;
  patient: string;
  provider: string;
  updated_at: u64;
}















export interface Client {
  /**
   * Construct and simulate a admin transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  admin: (options?: MethodOptions) => Promise<AssembledTransaction<Result<string>>>

  /**
   * Construct and simulate a role_of transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  role_of: ({account}: {account: string}, options?: MethodOptions) => Promise<AssembledTransaction<Option<Role>>>

  /**
   * Construct and simulate a set_role transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  set_role: ({account, role, enabled}: {account: string, role: Role, enabled: boolean}, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a get_claim transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_claim: ({claim_id}: {claim_id: Buffer}, options?: MethodOptions) => Promise<AssembledTransaction<Result<Claim>>>

  /**
   * Construct and simulate a get_grant transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_grant: ({record_id, grantee}: {record_id: Buffer, grantee: string}, options?: MethodOptions) => Promise<AssembledTransaction<Result<AccessGrant>>>

  /**
   * Construct and simulate a pay_claim transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Atomically transfers configured stablecoin from insurer to provider.
   */
  pay_claim: ({insurer, claim_id}: {insurer: string, claim_id: Buffer}, options?: MethodOptions) => Promise<AssembledTransaction<Result<Claim>>>

  /**
   * Construct and simulate a get_policy transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_policy: ({insurer, patient}: {insurer: string, patient: string}, options?: MethodOptions) => Promise<AssembledTransaction<Result<Policy>>>

  /**
   * Construct and simulate a get_record transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_record: ({record_id}: {record_id: Buffer}, options?: MethodOptions) => Promise<AssembledTransaction<Result<MedicalRecord>>>

  /**
   * Construct and simulate a has_access transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  has_access: ({record_id, grantee}: {record_id: Buffer, grantee: string}, options?: MethodOptions) => Promise<AssembledTransaction<boolean>>

  /**
   * Construct and simulate a initialize transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  initialize: ({admin}: {admin: string}, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a set_policy transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  set_policy: ({insurer, patient, token, max_per_claim, valid_until, active}: {insurer: string, patient: string, token: string, max_per_claim: i128, valid_until: u64, active: boolean}, options?: MethodOptions) => Promise<AssembledTransaction<Result<Policy>>>

  /**
   * Construct and simulate a cancel_claim transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  cancel_claim: ({patient, claim_id}: {patient: string, claim_id: Buffer}, options?: MethodOptions) => Promise<AssembledTransaction<Result<Claim>>>

  /**
   * Construct and simulate a grant_access transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  grant_access: ({patient, record_id, grantee, expires_at, key_commitment}: {patient: string, record_id: Buffer, grantee: string, expires_at: u64, key_commitment: Buffer}, options?: MethodOptions) => Promise<AssembledTransaction<Result<AccessGrant>>>

  /**
   * Construct and simulate a reject_claim transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  reject_claim: ({insurer, claim_id, reason_hash}: {insurer: string, claim_id: Buffer, reason_hash: Buffer}, options?: MethodOptions) => Promise<AssembledTransaction<Result<Claim>>>

  /**
   * Construct and simulate a submit_claim transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  submit_claim: ({patient, provider, insurer, claim_id, record_id, amount, evidence_hash}: {patient: string, provider: string, insurer: string, claim_id: Buffer, record_id: Buffer, amount: i128, evidence_hash: Buffer}, options?: MethodOptions) => Promise<AssembledTransaction<Result<Claim>>>

  /**
   * Construct and simulate a approve_claim transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  approve_claim: ({insurer, claim_id}: {insurer: string, claim_id: Buffer}, options?: MethodOptions) => Promise<AssembledTransaction<Result<Claim>>>

  /**
   * Construct and simulate a revoke_access transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  revoke_access: ({patient, record_id, grantee}: {patient: string, record_id: Buffer, grantee: string}, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a rotate_record transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Publishes new encrypted version and invalidates every old key grant.
   */
  rotate_record: ({patient, record_id, content_hash, locator_hash}: {patient: string, record_id: Buffer, content_hash: Buffer, locator_hash: Buffer}, options?: MethodOptions) => Promise<AssembledTransaction<Result<MedicalRecord>>>

  /**
   * Construct and simulate a request_access transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Audit-only request. No permission changes occur.
   */
  request_access: ({requester, record_id, requested_until}: {requester: string, record_id: Buffer, requested_until: u64}, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a transfer_admin transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  transfer_admin: ({new_admin}: {new_admin: string}, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a register_record transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  register_record: ({patient, provider, record_id, content_hash, locator_hash}: {patient: string, provider: string, record_id: Buffer, content_hash: Buffer, locator_hash: Buffer}, options?: MethodOptions) => Promise<AssembledTransaction<Result<MedicalRecord>>>

}
export class Client extends ContractClient {
  static async deploy<T = Client>(
    /** Options for initializing a Client as well as for calling a method, with extras specific to deploying. */
    options: MethodOptions &
      Omit<ContractClientOptions, "contractId"> & {
        /** The hash of the Wasm blob, which must already be installed on-chain. */
        wasmHash: Buffer | string;
        /** Salt used to generate the contract's ID. Passed through to {@link Operation.createCustomContract}. Default: random. */
        salt?: Buffer | Uint8Array;
        /** The format used to decode `wasmHash`, if it's provided as a string. */
        format?: "hex" | "base64";
      }
  ): Promise<AssembledTransaction<T>> {
    return ContractClient.deploy(null, options)
  }
  constructor(public readonly options: ContractClientOptions) {
    super(
      new ContractSpec([ "AAAAAAAAAAAAAAAFYWRtaW4AAAAAAAAAAAAAAQAAA+kAAAATAAAH0AAAAA1Db250cmFjdEVycm9yAAAA",
        "AAAAAAAAAAAAAAAHcm9sZV9vZgAAAAABAAAAAAAAAAdhY2NvdW50AAAAABMAAAABAAAD6AAAB9AAAAAEUm9sZQ==",
        "AAAAAAAAAAAAAAAIc2V0X3JvbGUAAAADAAAAAAAAAAdhY2NvdW50AAAAABMAAAAAAAAABHJvbGUAAAfQAAAABFJvbGUAAAAAAAAAB2VuYWJsZWQAAAAAAQAAAAEAAAPpAAAAAgAAB9AAAAANQ29udHJhY3RFcnJvcgAAAA==",
        "AAAAAAAAAAAAAAAJZ2V0X2NsYWltAAAAAAAAAQAAAAAAAAAIY2xhaW1faWQAAAPuAAAAIAAAAAEAAAPpAAAH0AAAAAVDbGFpbQAAAAAAB9AAAAANQ29udHJhY3RFcnJvcgAAAA==",
        "AAAAAAAAAAAAAAAJZ2V0X2dyYW50AAAAAAAAAgAAAAAAAAAJcmVjb3JkX2lkAAAAAAAD7gAAACAAAAAAAAAAB2dyYW50ZWUAAAAAEwAAAAEAAAPpAAAH0AAAAAtBY2Nlc3NHcmFudAAAAAfQAAAADUNvbnRyYWN0RXJyb3IAAAA=",
        "AAAAAAAAAERBdG9taWNhbGx5IHRyYW5zZmVycyBjb25maWd1cmVkIHN0YWJsZWNvaW4gZnJvbSBpbnN1cmVyIHRvIHByb3ZpZGVyLgAAAAlwYXlfY2xhaW0AAAAAAAACAAAAAAAAAAdpbnN1cmVyAAAAABMAAAAAAAAACGNsYWltX2lkAAAD7gAAACAAAAABAAAD6QAAB9AAAAAFQ2xhaW0AAAAAAAfQAAAADUNvbnRyYWN0RXJyb3IAAAA=",
        "AAAAAAAAAAAAAAAKZ2V0X3BvbGljeQAAAAAAAgAAAAAAAAAHaW5zdXJlcgAAAAATAAAAAAAAAAdwYXRpZW50AAAAABMAAAABAAAD6QAAB9AAAAAGUG9saWN5AAAAAAfQAAAADUNvbnRyYWN0RXJyb3IAAAA=",
        "AAAAAAAAAAAAAAAKZ2V0X3JlY29yZAAAAAAAAQAAAAAAAAAJcmVjb3JkX2lkAAAAAAAD7gAAACAAAAABAAAD6QAAB9AAAAANTWVkaWNhbFJlY29yZAAAAAAAB9AAAAANQ29udHJhY3RFcnJvcgAAAA==",
        "AAAAAAAAAAAAAAAKaGFzX2FjY2VzcwAAAAAAAgAAAAAAAAAJcmVjb3JkX2lkAAAAAAAD7gAAACAAAAAAAAAAB2dyYW50ZWUAAAAAEwAAAAEAAAAB",
        "AAAAAAAAAAAAAAAKaW5pdGlhbGl6ZQAAAAAAAQAAAAAAAAAFYWRtaW4AAAAAAAATAAAAAQAAA+kAAAACAAAH0AAAAA1Db250cmFjdEVycm9yAAAA",
        "AAAAAAAAAAAAAAAKc2V0X3BvbGljeQAAAAAABgAAAAAAAAAHaW5zdXJlcgAAAAATAAAAAAAAAAdwYXRpZW50AAAAABMAAAAAAAAABXRva2VuAAAAAAAAEwAAAAAAAAANbWF4X3Blcl9jbGFpbQAAAAAAAAsAAAAAAAAAC3ZhbGlkX3VudGlsAAAAAAYAAAAAAAAABmFjdGl2ZQAAAAAAAQAAAAEAAAPpAAAH0AAAAAZQb2xpY3kAAAAAB9AAAAANQ29udHJhY3RFcnJvcgAAAA==",
        "AAAAAAAAAAAAAAAMY2FuY2VsX2NsYWltAAAAAgAAAAAAAAAHcGF0aWVudAAAAAATAAAAAAAAAAhjbGFpbV9pZAAAA+4AAAAgAAAAAQAAA+kAAAfQAAAABUNsYWltAAAAAAAH0AAAAA1Db250cmFjdEVycm9yAAAA",
        "AAAAAAAAAAAAAAAMZ3JhbnRfYWNjZXNzAAAABQAAAAAAAAAHcGF0aWVudAAAAAATAAAAAAAAAAlyZWNvcmRfaWQAAAAAAAPuAAAAIAAAAAAAAAAHZ3JhbnRlZQAAAAATAAAAAAAAAApleHBpcmVzX2F0AAAAAAAGAAAAAAAAAA5rZXlfY29tbWl0bWVudAAAAAAD7gAAACAAAAABAAAD6QAAB9AAAAALQWNjZXNzR3JhbnQAAAAH0AAAAA1Db250cmFjdEVycm9yAAAA",
        "AAAAAAAAAAAAAAAMcmVqZWN0X2NsYWltAAAAAwAAAAAAAAAHaW5zdXJlcgAAAAATAAAAAAAAAAhjbGFpbV9pZAAAA+4AAAAgAAAAAAAAAAtyZWFzb25faGFzaAAAAAPuAAAAIAAAAAEAAAPpAAAH0AAAAAVDbGFpbQAAAAAAB9AAAAANQ29udHJhY3RFcnJvcgAAAA==",
        "AAAAAAAAAAAAAAAMc3VibWl0X2NsYWltAAAABwAAAAAAAAAHcGF0aWVudAAAAAATAAAAAAAAAAhwcm92aWRlcgAAABMAAAAAAAAAB2luc3VyZXIAAAAAEwAAAAAAAAAIY2xhaW1faWQAAAPuAAAAIAAAAAAAAAAJcmVjb3JkX2lkAAAAAAAD7gAAACAAAAAAAAAABmFtb3VudAAAAAAACwAAAAAAAAANZXZpZGVuY2VfaGFzaAAAAAAAA+4AAAAgAAAAAQAAA+kAAAfQAAAABUNsYWltAAAAAAAH0AAAAA1Db250cmFjdEVycm9yAAAA",
        "AAAAAAAAAAAAAAANYXBwcm92ZV9jbGFpbQAAAAAAAAIAAAAAAAAAB2luc3VyZXIAAAAAEwAAAAAAAAAIY2xhaW1faWQAAAPuAAAAIAAAAAEAAAPpAAAH0AAAAAVDbGFpbQAAAAAAB9AAAAANQ29udHJhY3RFcnJvcgAAAA==",
        "AAAAAAAAAAAAAAANcmV2b2tlX2FjY2VzcwAAAAAAAAMAAAAAAAAAB3BhdGllbnQAAAAAEwAAAAAAAAAJcmVjb3JkX2lkAAAAAAAD7gAAACAAAAAAAAAAB2dyYW50ZWUAAAAAEwAAAAEAAAPpAAAAAgAAB9AAAAANQ29udHJhY3RFcnJvcgAAAA==",
        "AAAAAAAAAERQdWJsaXNoZXMgbmV3IGVuY3J5cHRlZCB2ZXJzaW9uIGFuZCBpbnZhbGlkYXRlcyBldmVyeSBvbGQga2V5IGdyYW50LgAAAA1yb3RhdGVfcmVjb3JkAAAAAAAABAAAAAAAAAAHcGF0aWVudAAAAAATAAAAAAAAAAlyZWNvcmRfaWQAAAAAAAPuAAAAIAAAAAAAAAAMY29udGVudF9oYXNoAAAD7gAAACAAAAAAAAAADGxvY2F0b3JfaGFzaAAAA+4AAAAgAAAAAQAAA+kAAAfQAAAADU1lZGljYWxSZWNvcmQAAAAAAAfQAAAADUNvbnRyYWN0RXJyb3IAAAA=",
        "AAAAAAAAADBBdWRpdC1vbmx5IHJlcXVlc3QuIE5vIHBlcm1pc3Npb24gY2hhbmdlcyBvY2N1ci4AAAAOcmVxdWVzdF9hY2Nlc3MAAAAAAAMAAAAAAAAACXJlcXVlc3RlcgAAAAAAABMAAAAAAAAACXJlY29yZF9pZAAAAAAAA+4AAAAgAAAAAAAAAA9yZXF1ZXN0ZWRfdW50aWwAAAAABgAAAAEAAAPpAAAAAgAAB9AAAAANQ29udHJhY3RFcnJvcgAAAA==",
        "AAAAAAAAAAAAAAAOdHJhbnNmZXJfYWRtaW4AAAAAAAEAAAAAAAAACW5ld19hZG1pbgAAAAAAABMAAAABAAAD6QAAAAIAAAfQAAAADUNvbnRyYWN0RXJyb3IAAAA=",
        "AAAAAAAAAAAAAAAPcmVnaXN0ZXJfcmVjb3JkAAAAAAUAAAAAAAAAB3BhdGllbnQAAAAAEwAAAAAAAAAIcHJvdmlkZXIAAAATAAAAAAAAAAlyZWNvcmRfaWQAAAAAAAPuAAAAIAAAAAAAAAAMY29udGVudF9oYXNoAAAD7gAAACAAAAAAAAAADGxvY2F0b3JfaGFzaAAAA+4AAAAgAAAAAQAAA+kAAAfQAAAADU1lZGljYWxSZWNvcmQAAAAAAAfQAAAADUNvbnRyYWN0RXJyb3IAAAA=",
        "AAAAAgAAAAAAAAAAAAAABFJvbGUAAAACAAAAAAAAAAAAAAAIUHJvdmlkZXIAAAAAAAAAAAAAAAdJbnN1cmVyAA==",
        "AAAAAQAAAAAAAAAAAAAABUNsYWltAAAAAAAACQAAAAAAAAAGYW1vdW50AAAAAAALAAAAAAAAAA1ldmlkZW5jZV9oYXNoAAAAAAAD7gAAACAAAAAAAAAAB2luc3VyZXIAAAAAEwAAAAAAAAAHcGF0aWVudAAAAAATAAAAAAAAAAhwcm92aWRlcgAAABMAAAAAAAAACXJlY29yZF9pZAAAAAAAA+4AAAAgAAAAAAAAAAZzdGF0dXMAAAAAB9AAAAALQ2xhaW1TdGF0dXMAAAAAAAAAAAxzdWJtaXR0ZWRfYXQAAAAGAAAAAAAAAAV0b2tlbgAAAAAAABM=",
        "AAAAAQAAAAAAAAAAAAAABlBvbGljeQAAAAAABgAAAAAAAAAGYWN0aXZlAAAAAAABAAAAAAAAAAdpbnN1cmVyAAAAABMAAAAAAAAADW1heF9wZXJfY2xhaW0AAAAAAAALAAAAAAAAAAdwYXRpZW50AAAAABMAAAAAAAAABXRva2VuAAAAAAAAEwAAAAAAAAALdmFsaWRfdW50aWwAAAAABg==",
        "AAAAAQAAAAAAAAAAAAAAC0FjY2Vzc0dyYW50AAAAAAYAAAAAAAAACmV4cGlyZXNfYXQAAAAAAAYAAAAAAAAACmdyYW50ZWRfYXQAAAAAAAYAAAAAAAAAB2dyYW50ZWUAAAAAEwAAADlDb21taXRtZW50IHRvIGVuY3J5cHRlZCBrZXkgZW52ZWxvcGUgZGVsaXZlcmVkIG9mZi1jaGFpbi4AAAAAAAAOa2V5X2NvbW1pdG1lbnQAAAAAA+4AAAAgAAAAAAAAAAtrZXlfdmVyc2lvbgAAAAAEAAAAAAAAAAdwYXRpZW50AAAAABM=",
        "AAAAAgAAAAAAAAAAAAAAC0NsYWltU3RhdHVzAAAAAAUAAAAAAAAAAAAAAAdQZW5kaW5nAAAAAAAAAAAAAAAACEFwcHJvdmVkAAAAAAAAAAAAAAAEUGFpZAAAAAAAAAAAAAAACFJlamVjdGVkAAAAAAAAAAAAAAAJQ2FuY2VsbGVkAAAA",
        "AAAABAAAAAAAAAAAAAAADUNvbnRyYWN0RXJyb3IAAAAAAAARAAAAAAAAABJBbHJlYWR5SW5pdGlhbGl6ZWQAAAAAAAEAAAAAAAAADk5vdEluaXRpYWxpemVkAAAAAAACAAAAAAAAABBVbmF1dGhvcml6ZWRSb2xlAAAAAwAAAAAAAAATUmVjb3JkQWxyZWFkeUV4aXN0cwAAAAAEAAAAAAAAAA5SZWNvcmROb3RGb3VuZAAAAAAABQAAAAAAAAAOTm90UmVjb3JkT3duZXIAAAAAAAYAAAAAAAAADUludmFsaWRFeHBpcnkAAAAAAAAHAAAAAAAAAA1HcmFudE5vdEZvdW5kAAAAAAAACAAAAAAAAAAOUG9saWN5Tm90Rm91bmQAAAAAAAkAAAAAAAAADlBvbGljeUluYWN0aXZlAAAAAAAKAAAAAAAAABJDbGFpbUFscmVhZHlFeGlzdHMAAAAAAAsAAAAAAAAADUNsYWltTm90Rm91bmQAAAAAAAAMAAAAAAAAABFJbnZhbGlkQ2xhaW1TdGF0ZQAAAAAAAA0AAAAAAAAADUludmFsaWRBbW91bnQAAAAAAAAOAAAAAAAAABBDb3ZlcmFnZUV4Y2VlZGVkAAAADwAAAAAAAAAOQWNjZXNzUmVxdWlyZWQAAAAAABAAAAAAAAAAC0ludmFsaWRSb2xlAAAAABE=",
        "AAAAAQAAAAAAAAAAAAAADU1lZGljYWxSZWNvcmQAAAAAAAAHAAAAKVNIQS0yNTYgZGlnZXN0IG9mIGVuY3J5cHRlZCByZWNvcmQgYnl0ZXMuAAAAAAAADGNvbnRlbnRfaGFzaAAAA+4AAAAgAAAAAAAAAApjcmVhdGVkX2F0AAAAAAAGAAAAQkVuY3J5cHRpb24ta2V5IGdlbmVyYXRpb24uIFJvdGF0aW5nIHJlY29yZCBpbnZhbGlkYXRlcyBvbGQgZ3JhbnRzLgAAAAAAC2tleV92ZXJzaW9uAAAAAAQAAABFU0hBLTI1NiBkaWdlc3Qgb2YgY2Fub25pY2FsIG9mZi1jaGFpbiBsb2NhdG9yOyBsb2NhdG9yIHN0YXlzIHByaXZhdGUuAAAAAAAADGxvY2F0b3JfaGFzaAAAA+4AAAAgAAAAAAAAAAdwYXRpZW50AAAAABMAAAAAAAAACHByb3ZpZGVyAAAAEwAAAAAAAAAKdXBkYXRlZF9hdAAAAAAABg==",
        "AAAABQAAAAAAAAAAAAAACUNsYWltUGFpZAAAAAAAAAEAAAAKY2xhaW1fcGFpZAAAAAAABQAAAAAAAAAHaW5zdXJlcgAAAAATAAAAAQAAAAAAAAAIcHJvdmlkZXIAAAATAAAAAQAAAAAAAAAIY2xhaW1faWQAAAPuAAAAIAAAAAEAAAAAAAAABXRva2VuAAAAAAAAEwAAAAAAAAAAAAAABmFtb3VudAAAAAAACwAAAAAAAAAC",
        "AAAABQAAAAAAAAAAAAAACVBvbGljeVNldAAAAAAAAAEAAAAKcG9saWN5X3NldAAAAAAABQAAAAAAAAAHaW5zdXJlcgAAAAATAAAAAQAAAAAAAAAHcGF0aWVudAAAAAATAAAAAQAAAAAAAAANbWF4X3Blcl9jbGFpbQAAAAAAAAsAAAAAAAAAAAAAAAt2YWxpZF91bnRpbAAAAAAGAAAAAAAAAAAAAAAGYWN0aXZlAAAAAAABAAAAAAAAAAI=",
        "AAAABQAAAAAAAAAAAAAAC0luaXRpYWxpemVkAAAAAAEAAAALaW5pdGlhbGl6ZWQAAAAAAQAAAAAAAAAFYWRtaW4AAAAAAAATAAAAAQAAAAI=",
        "AAAABQAAAAAAAAAAAAAAC1JvbGVDaGFuZ2VkAAAAAAEAAAAMcm9sZV9jaGFuZ2VkAAAAAwAAAAAAAAAHYWNjb3VudAAAAAATAAAAAQAAAAAAAAAEcm9sZQAAB9AAAAAEUm9sZQAAAAAAAAAAAAAAB2VuYWJsZWQAAAAAAQAAAAAAAAAC",
        "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" ]),
      options
    )
  }
  public readonly fromJSON = {
    admin: this.txFromJSON<Result<string>>,
        role_of: this.txFromJSON<Option<Role>>,
        set_role: this.txFromJSON<Result<void>>,
        get_claim: this.txFromJSON<Result<Claim>>,
        get_grant: this.txFromJSON<Result<AccessGrant>>,
        pay_claim: this.txFromJSON<Result<Claim>>,
        get_policy: this.txFromJSON<Result<Policy>>,
        get_record: this.txFromJSON<Result<MedicalRecord>>,
        has_access: this.txFromJSON<boolean>,
        initialize: this.txFromJSON<Result<void>>,
        set_policy: this.txFromJSON<Result<Policy>>,
        cancel_claim: this.txFromJSON<Result<Claim>>,
        grant_access: this.txFromJSON<Result<AccessGrant>>,
        reject_claim: this.txFromJSON<Result<Claim>>,
        submit_claim: this.txFromJSON<Result<Claim>>,
        approve_claim: this.txFromJSON<Result<Claim>>,
        revoke_access: this.txFromJSON<Result<void>>,
        rotate_record: this.txFromJSON<Result<MedicalRecord>>,
        request_access: this.txFromJSON<Result<void>>,
        transfer_admin: this.txFromJSON<Result<void>>,
        register_record: this.txFromJSON<Result<MedicalRecord>>
  }
}