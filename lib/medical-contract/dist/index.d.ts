import { Buffer } from "buffer";
import { AssembledTransaction, Client as ContractClient, ClientOptions as ContractClientOptions, MethodOptions, Result } from "@stellar/stellar-sdk/contract";
import type { u32, u64, i128, Option } from "@stellar/stellar-sdk/contract";
export * from "@stellar/stellar-sdk";
export * as contract from "@stellar/stellar-sdk/contract";
export * as rpc from "@stellar/stellar-sdk/rpc";
export type Role = {
    tag: "Provider";
    values: void;
} | {
    tag: "Insurer";
    values: void;
};
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
export type ClaimStatus = {
    tag: "Pending";
    values: void;
} | {
    tag: "Approved";
    values: void;
} | {
    tag: "Paid";
    values: void;
} | {
    tag: "Rejected";
    values: void;
} | {
    tag: "Cancelled";
    values: void;
};
export declare const ContractError: {
    1: {
        message: string;
    };
    2: {
        message: string;
    };
    3: {
        message: string;
    };
    4: {
        message: string;
    };
    5: {
        message: string;
    };
    6: {
        message: string;
    };
    7: {
        message: string;
    };
    8: {
        message: string;
    };
    9: {
        message: string;
    };
    10: {
        message: string;
    };
    11: {
        message: string;
    };
    12: {
        message: string;
    };
    13: {
        message: string;
    };
    14: {
        message: string;
    };
    15: {
        message: string;
    };
    16: {
        message: string;
    };
    17: {
        message: string;
    };
};
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
    admin: (options?: MethodOptions) => Promise<AssembledTransaction<Result<string>>>;
    /**
     * Construct and simulate a role_of transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
     */
    role_of: ({ account }: {
        account: string;
    }, options?: MethodOptions) => Promise<AssembledTransaction<Option<Role>>>;
    /**
     * Construct and simulate a set_role transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
     */
    set_role: ({ account, role, enabled }: {
        account: string;
        role: Role;
        enabled: boolean;
    }, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>;
    /**
     * Construct and simulate a get_claim transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
     */
    get_claim: ({ claim_id }: {
        claim_id: Buffer;
    }, options?: MethodOptions) => Promise<AssembledTransaction<Result<Claim>>>;
    /**
     * Construct and simulate a get_grant transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
     */
    get_grant: ({ record_id, grantee }: {
        record_id: Buffer;
        grantee: string;
    }, options?: MethodOptions) => Promise<AssembledTransaction<Result<AccessGrant>>>;
    /**
     * Construct and simulate a pay_claim transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
     * Atomically transfers configured stablecoin from insurer to provider.
     */
    pay_claim: ({ insurer, claim_id }: {
        insurer: string;
        claim_id: Buffer;
    }, options?: MethodOptions) => Promise<AssembledTransaction<Result<Claim>>>;
    /**
     * Construct and simulate a get_policy transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
     */
    get_policy: ({ insurer, patient }: {
        insurer: string;
        patient: string;
    }, options?: MethodOptions) => Promise<AssembledTransaction<Result<Policy>>>;
    /**
     * Construct and simulate a get_record transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
     */
    get_record: ({ record_id }: {
        record_id: Buffer;
    }, options?: MethodOptions) => Promise<AssembledTransaction<Result<MedicalRecord>>>;
    /**
     * Construct and simulate a has_access transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
     */
    has_access: ({ record_id, grantee }: {
        record_id: Buffer;
        grantee: string;
    }, options?: MethodOptions) => Promise<AssembledTransaction<boolean>>;
    /**
     * Construct and simulate a initialize transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
     */
    initialize: ({ admin }: {
        admin: string;
    }, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>;
    /**
     * Construct and simulate a set_policy transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
     */
    set_policy: ({ insurer, patient, token, max_per_claim, valid_until, active }: {
        insurer: string;
        patient: string;
        token: string;
        max_per_claim: i128;
        valid_until: u64;
        active: boolean;
    }, options?: MethodOptions) => Promise<AssembledTransaction<Result<Policy>>>;
    /**
     * Construct and simulate a cancel_claim transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
     */
    cancel_claim: ({ patient, claim_id }: {
        patient: string;
        claim_id: Buffer;
    }, options?: MethodOptions) => Promise<AssembledTransaction<Result<Claim>>>;
    /**
     * Construct and simulate a grant_access transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
     */
    grant_access: ({ patient, record_id, grantee, expires_at, key_commitment }: {
        patient: string;
        record_id: Buffer;
        grantee: string;
        expires_at: u64;
        key_commitment: Buffer;
    }, options?: MethodOptions) => Promise<AssembledTransaction<Result<AccessGrant>>>;
    /**
     * Construct and simulate a reject_claim transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
     */
    reject_claim: ({ insurer, claim_id, reason_hash }: {
        insurer: string;
        claim_id: Buffer;
        reason_hash: Buffer;
    }, options?: MethodOptions) => Promise<AssembledTransaction<Result<Claim>>>;
    /**
     * Construct and simulate a submit_claim transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
     */
    submit_claim: ({ patient, provider, insurer, claim_id, record_id, amount, evidence_hash }: {
        patient: string;
        provider: string;
        insurer: string;
        claim_id: Buffer;
        record_id: Buffer;
        amount: i128;
        evidence_hash: Buffer;
    }, options?: MethodOptions) => Promise<AssembledTransaction<Result<Claim>>>;
    /**
     * Construct and simulate a approve_claim transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
     */
    approve_claim: ({ insurer, claim_id }: {
        insurer: string;
        claim_id: Buffer;
    }, options?: MethodOptions) => Promise<AssembledTransaction<Result<Claim>>>;
    /**
     * Construct and simulate a revoke_access transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
     */
    revoke_access: ({ patient, record_id, grantee }: {
        patient: string;
        record_id: Buffer;
        grantee: string;
    }, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>;
    /**
     * Construct and simulate a rotate_record transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
     * Publishes new encrypted version and invalidates every old key grant.
     */
    rotate_record: ({ patient, record_id, content_hash, locator_hash }: {
        patient: string;
        record_id: Buffer;
        content_hash: Buffer;
        locator_hash: Buffer;
    }, options?: MethodOptions) => Promise<AssembledTransaction<Result<MedicalRecord>>>;
    /**
     * Construct and simulate a request_access transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
     * Audit-only request. No permission changes occur.
     */
    request_access: ({ requester, record_id, requested_until }: {
        requester: string;
        record_id: Buffer;
        requested_until: u64;
    }, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>;
    /**
     * Construct and simulate a transfer_admin transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
     */
    transfer_admin: ({ new_admin }: {
        new_admin: string;
    }, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>;
    /**
     * Construct and simulate a register_record transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
     */
    register_record: ({ patient, provider, record_id, content_hash, locator_hash }: {
        patient: string;
        provider: string;
        record_id: Buffer;
        content_hash: Buffer;
        locator_hash: Buffer;
    }, options?: MethodOptions) => Promise<AssembledTransaction<Result<MedicalRecord>>>;
}
export declare class Client extends ContractClient {
    readonly options: ContractClientOptions;
    static deploy<T = Client>(
    /** Options for initializing a Client as well as for calling a method, with extras specific to deploying. */
    options: MethodOptions & Omit<ContractClientOptions, "contractId"> & {
        /** The hash of the Wasm blob, which must already be installed on-chain. */
        wasmHash: Buffer | string;
        /** Salt used to generate the contract's ID. Passed through to {@link Operation.createCustomContract}. Default: random. */
        salt?: Buffer | Uint8Array;
        /** The format used to decode `wasmHash`, if it's provided as a string. */
        format?: "hex" | "base64";
    }): Promise<AssembledTransaction<T>>;
    constructor(options: ContractClientOptions);
    readonly fromJSON: {
        admin: (json: string) => AssembledTransaction<Result<string, import("@stellar/stellar-sdk/contract").ErrorMessage>>;
        role_of: (json: string) => AssembledTransaction<Option<Role>>;
        set_role: (json: string) => AssembledTransaction<Result<void, import("@stellar/stellar-sdk/contract").ErrorMessage>>;
        get_claim: (json: string) => AssembledTransaction<Result<Claim, import("@stellar/stellar-sdk/contract").ErrorMessage>>;
        get_grant: (json: string) => AssembledTransaction<Result<AccessGrant, import("@stellar/stellar-sdk/contract").ErrorMessage>>;
        pay_claim: (json: string) => AssembledTransaction<Result<Claim, import("@stellar/stellar-sdk/contract").ErrorMessage>>;
        get_policy: (json: string) => AssembledTransaction<Result<Policy, import("@stellar/stellar-sdk/contract").ErrorMessage>>;
        get_record: (json: string) => AssembledTransaction<Result<MedicalRecord, import("@stellar/stellar-sdk/contract").ErrorMessage>>;
        has_access: (json: string) => AssembledTransaction<boolean>;
        initialize: (json: string) => AssembledTransaction<Result<void, import("@stellar/stellar-sdk/contract").ErrorMessage>>;
        set_policy: (json: string) => AssembledTransaction<Result<Policy, import("@stellar/stellar-sdk/contract").ErrorMessage>>;
        cancel_claim: (json: string) => AssembledTransaction<Result<Claim, import("@stellar/stellar-sdk/contract").ErrorMessage>>;
        grant_access: (json: string) => AssembledTransaction<Result<AccessGrant, import("@stellar/stellar-sdk/contract").ErrorMessage>>;
        reject_claim: (json: string) => AssembledTransaction<Result<Claim, import("@stellar/stellar-sdk/contract").ErrorMessage>>;
        submit_claim: (json: string) => AssembledTransaction<Result<Claim, import("@stellar/stellar-sdk/contract").ErrorMessage>>;
        approve_claim: (json: string) => AssembledTransaction<Result<Claim, import("@stellar/stellar-sdk/contract").ErrorMessage>>;
        revoke_access: (json: string) => AssembledTransaction<Result<void, import("@stellar/stellar-sdk/contract").ErrorMessage>>;
        rotate_record: (json: string) => AssembledTransaction<Result<MedicalRecord, import("@stellar/stellar-sdk/contract").ErrorMessage>>;
        request_access: (json: string) => AssembledTransaction<Result<void, import("@stellar/stellar-sdk/contract").ErrorMessage>>;
        transfer_admin: (json: string) => AssembledTransaction<Result<void, import("@stellar/stellar-sdk/contract").ErrorMessage>>;
        register_record: (json: string) => AssembledTransaction<Result<MedicalRecord, import("@stellar/stellar-sdk/contract").ErrorMessage>>;
    };
}
