use soroban_sdk::{contracterror, contracttype, Address, BytesN};

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum ContractError {
    AlreadyInitialized = 1,
    NotInitialized = 2,
    UnauthorizedRole = 3,
    RecordAlreadyExists = 4,
    RecordNotFound = 5,
    NotRecordOwner = 6,
    InvalidExpiry = 7,
    GrantNotFound = 8,
    PolicyNotFound = 9,
    PolicyInactive = 10,
    ClaimAlreadyExists = 11,
    ClaimNotFound = 12,
    InvalidClaimState = 13,
    InvalidAmount = 14,
    CoverageExceeded = 15,
    AccessRequired = 16,
    InvalidRole = 17,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum Role {
    Provider,
    Insurer,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum ClaimStatus {
    Pending,
    Approved,
    Paid,
    Rejected,
    Cancelled,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct MedicalRecord {
    pub patient: Address,
    pub provider: Address,
    /// SHA-256 digest of encrypted record bytes.
    pub content_hash: BytesN<32>,
    /// SHA-256 digest of canonical off-chain locator; locator stays private.
    pub locator_hash: BytesN<32>,
    pub created_at: u64,
    pub updated_at: u64,
    /// Encryption-key generation. Rotating record invalidates old grants.
    pub key_version: u32,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct AccessGrant {
    pub patient: Address,
    pub grantee: Address,
    pub granted_at: u64,
    pub expires_at: u64,
    pub key_version: u32,
    /// Commitment to encrypted key envelope delivered off-chain.
    pub key_commitment: BytesN<32>,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Policy {
    pub insurer: Address,
    pub patient: Address,
    pub token: Address,
    pub max_per_claim: i128,
    pub valid_until: u64,
    pub active: bool,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Claim {
    pub patient: Address,
    pub provider: Address,
    pub insurer: Address,
    pub record_id: BytesN<32>,
    pub token: Address,
    pub amount: i128,
    pub evidence_hash: BytesN<32>,
    pub submitted_at: u64,
    pub status: ClaimStatus,
}

#[contracttype]
#[derive(Clone)]
pub(crate) enum DataKey {
    Admin,
    Role(Address),
    Record(BytesN<32>),
    Grant(BytesN<32>, Address),
    Policy(Address, Address),
    Claim(BytesN<32>),
}
