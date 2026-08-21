use soroban_sdk::{contractevent, Address, BytesN};

use crate::Role;

#[contractevent]
pub struct Initialized {
    #[topic]
    pub admin: Address,
}

#[contractevent]
pub struct AdminTransferred {
    #[topic]
    pub old_admin: Address,
    #[topic]
    pub new_admin: Address,
}

#[contractevent]
pub struct RoleChanged {
    #[topic]
    pub account: Address,
    pub role: Role,
    pub enabled: bool,
}

#[contractevent]
pub struct RecordRegistered {
    #[topic]
    pub patient: Address,
    #[topic]
    pub record_id: BytesN<32>,
    pub provider: Address,
    pub content_hash: BytesN<32>,
}

#[contractevent]
pub struct RecordRotated {
    #[topic]
    pub patient: Address,
    #[topic]
    pub record_id: BytesN<32>,
    pub key_version: u32,
}

#[contractevent]
pub struct AccessRequested {
    #[topic]
    pub requester: Address,
    #[topic]
    pub record_id: BytesN<32>,
    pub requested_until: u64,
}

#[contractevent]
pub struct AccessGranted {
    #[topic]
    pub patient: Address,
    #[topic]
    pub grantee: Address,
    #[topic]
    pub record_id: BytesN<32>,
    pub expires_at: u64,
    pub key_version: u32,
}

#[contractevent]
pub struct AccessRevoked {
    #[topic]
    pub patient: Address,
    #[topic]
    pub grantee: Address,
    #[topic]
    pub record_id: BytesN<32>,
}

#[contractevent]
pub struct PolicySet {
    #[topic]
    pub insurer: Address,
    #[topic]
    pub patient: Address,
    pub max_per_claim: i128,
    pub valid_until: u64,
    pub active: bool,
}

#[contractevent]
pub struct ClaimSubmitted {
    #[topic]
    pub patient: Address,
    #[topic]
    pub insurer: Address,
    #[topic]
    pub claim_id: BytesN<32>,
    pub provider: Address,
    pub amount: i128,
}

#[contractevent]
pub struct ClaimApproved {
    #[topic]
    pub insurer: Address,
    #[topic]
    pub claim_id: BytesN<32>,
    pub amount: i128,
}

#[contractevent]
pub struct ClaimRejected {
    #[topic]
    pub insurer: Address,
    #[topic]
    pub claim_id: BytesN<32>,
    pub reason_hash: BytesN<32>,
}

#[contractevent]
pub struct ClaimCancelled {
    #[topic]
    pub patient: Address,
    #[topic]
    pub claim_id: BytesN<32>,
}

#[contractevent]
pub struct ClaimPaid {
    #[topic]
    pub insurer: Address,
    #[topic]
    pub provider: Address,
    #[topic]
    pub claim_id: BytesN<32>,
    pub token: Address,
    pub amount: i128,
}
