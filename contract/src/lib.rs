#![no_std]

mod events;
mod storage;
mod types;

pub use types::{AccessGrant, Claim, ClaimStatus, ContractError, MedicalRecord, Policy, Role};

use events::*;
use soroban_sdk::{contract, contractimpl, token, Address, BytesN, Env};

#[contract]
pub struct MedicalRecordsContract;

fn require_role(env: &Env, account: &Address, expected: Role) -> Result<(), ContractError> {
    if storage::role(env, account) != Some(expected) {
        return Err(ContractError::UnauthorizedRole);
    }
    Ok(())
}

fn require_owner(record: &MedicalRecord, patient: &Address) -> Result<(), ContractError> {
    if &record.patient != patient {
        return Err(ContractError::NotRecordOwner);
    }
    Ok(())
}

fn active_access(env: &Env, record_id: &BytesN<32>, grantee: &Address) -> bool {
    let Ok(record) = storage::record(env, record_id) else {
        return false;
    };
    let Some(grant) = storage::grant(env, record_id, grantee) else {
        return false;
    };
    grant.expires_at > env.ledger().timestamp() && grant.key_version == record.key_version
}

#[contractimpl]
impl MedicalRecordsContract {
    pub fn initialize(env: Env, admin: Address) -> Result<(), ContractError> {
        if storage::admin(&env).is_ok() {
            return Err(ContractError::AlreadyInitialized);
        }
        admin.require_auth();
        storage::set_admin(&env, &admin);
        Initialized { admin }.publish(&env);
        Ok(())
    }

    pub fn admin(env: Env) -> Result<Address, ContractError> {
        storage::admin(&env)
    }

    pub fn transfer_admin(env: Env, new_admin: Address) -> Result<(), ContractError> {
        let admin = storage::admin(&env)?;
        admin.require_auth();
        new_admin.require_auth();
        storage::set_admin(&env, &new_admin);
        AdminTransferred {
            old_admin: admin,
            new_admin,
        }
        .publish(&env);
        Ok(())
    }

    pub fn set_role(
        env: Env,
        account: Address,
        role: Role,
        enabled: bool,
    ) -> Result<(), ContractError> {
        let admin = storage::admin(&env)?;
        admin.require_auth();
        if account == admin {
            return Err(ContractError::InvalidRole);
        }
        if enabled {
            storage::set_role(&env, &account, &role);
        } else {
            storage::remove_role(&env, &account);
        }
        RoleChanged {
            account,
            role,
            enabled,
        }
        .publish(&env);
        Ok(())
    }

    pub fn role_of(env: Env, account: Address) -> Option<Role> {
        storage::role(&env, &account)
    }

    pub fn register_record(
        env: Env,
        patient: Address,
        provider: Address,
        record_id: BytesN<32>,
        content_hash: BytesN<32>,
        locator_hash: BytesN<32>,
    ) -> Result<MedicalRecord, ContractError> {
        patient.require_auth();
        provider.require_auth();
        require_role(&env, &provider, Role::Provider)?;
        if storage::record_exists(&env, &record_id) {
            return Err(ContractError::RecordAlreadyExists);
        }
        let now = env.ledger().timestamp();
        let record = MedicalRecord {
            patient: patient.clone(),
            provider: provider.clone(),
            content_hash,
            locator_hash,
            created_at: now,
            updated_at: now,
            key_version: 1,
        };
        storage::put_record(&env, &record_id, &record);
        RecordRegistered {
            patient,
            record_id,
            provider,
            content_hash: record.content_hash.clone(),
        }
        .publish(&env);
        Ok(record)
    }

    /// Publishes new encrypted version and invalidates every old key grant.
    pub fn rotate_record(
        env: Env,
        patient: Address,
        record_id: BytesN<32>,
        content_hash: BytesN<32>,
        locator_hash: BytesN<32>,
    ) -> Result<MedicalRecord, ContractError> {
        patient.require_auth();
        let mut record = storage::record(&env, &record_id)?;
        require_owner(&record, &patient)?;
        record.content_hash = content_hash;
        record.locator_hash = locator_hash;
        record.updated_at = env.ledger().timestamp();
        record.key_version = record
            .key_version
            .checked_add(1)
            .ok_or(ContractError::InvalidExpiry)?;
        storage::put_record(&env, &record_id, &record);
        RecordRotated {
            patient,
            record_id,
            key_version: record.key_version,
        }
        .publish(&env);
        Ok(record)
    }

    pub fn get_record(env: Env, record_id: BytesN<32>) -> Result<MedicalRecord, ContractError> {
        storage::record(&env, &record_id)
    }

    /// Audit-only request. No permission changes occur.
    pub fn request_access(
        env: Env,
        requester: Address,
        record_id: BytesN<32>,
        requested_until: u64,
    ) -> Result<(), ContractError> {
        requester.require_auth();
        if storage::role(&env, &requester).is_none() {
            return Err(ContractError::UnauthorizedRole);
        }
        storage::record(&env, &record_id)?;
        if requested_until <= env.ledger().timestamp() {
            return Err(ContractError::InvalidExpiry);
        }
        AccessRequested {
            requester,
            record_id,
            requested_until,
        }
        .publish(&env);
        Ok(())
    }

    pub fn grant_access(
        env: Env,
        patient: Address,
        record_id: BytesN<32>,
        grantee: Address,
        expires_at: u64,
        key_commitment: BytesN<32>,
    ) -> Result<AccessGrant, ContractError> {
        patient.require_auth();
        if storage::role(&env, &grantee).is_none() {
            return Err(ContractError::UnauthorizedRole);
        }
        let record = storage::record(&env, &record_id)?;
        require_owner(&record, &patient)?;
        let now = env.ledger().timestamp();
        if expires_at <= now {
            return Err(ContractError::InvalidExpiry);
        }
        let grant = AccessGrant {
            patient: patient.clone(),
            grantee: grantee.clone(),
            granted_at: now,
            expires_at,
            key_version: record.key_version,
            key_commitment,
        };
        storage::put_grant(&env, &record_id, &grantee, &grant);
        AccessGranted {
            patient,
            grantee,
            record_id,
            expires_at,
            key_version: record.key_version,
        }
        .publish(&env);
        Ok(grant)
    }

    pub fn revoke_access(
        env: Env,
        patient: Address,
        record_id: BytesN<32>,
        grantee: Address,
    ) -> Result<(), ContractError> {
        patient.require_auth();
        let record = storage::record(&env, &record_id)?;
        require_owner(&record, &patient)?;
        if !storage::remove_grant(&env, &record_id, &grantee) {
            return Err(ContractError::GrantNotFound);
        }
        AccessRevoked {
            patient,
            grantee,
            record_id,
        }
        .publish(&env);
        Ok(())
    }

    pub fn has_access(env: Env, record_id: BytesN<32>, grantee: Address) -> bool {
        active_access(&env, &record_id, &grantee)
    }

    pub fn get_grant(
        env: Env,
        record_id: BytesN<32>,
        grantee: Address,
    ) -> Result<AccessGrant, ContractError> {
        storage::grant(&env, &record_id, &grantee).ok_or(ContractError::GrantNotFound)
    }

    pub fn set_policy(
        env: Env,
        insurer: Address,
        patient: Address,
        token: Address,
        max_per_claim: i128,
        valid_until: u64,
        active: bool,
    ) -> Result<Policy, ContractError> {
        insurer.require_auth();
        require_role(&env, &insurer, Role::Insurer)?;
        if max_per_claim <= 0 {
            return Err(ContractError::InvalidAmount);
        }
        if active && valid_until <= env.ledger().timestamp() {
            return Err(ContractError::InvalidExpiry);
        }
        let policy = Policy {
            insurer: insurer.clone(),
            patient: patient.clone(),
            token,
            max_per_claim,
            valid_until,
            active,
        };
        storage::put_policy(&env, &policy);
        PolicySet {
            insurer,
            patient,
            max_per_claim,
            valid_until,
            active,
        }
        .publish(&env);
        Ok(policy)
    }

    pub fn get_policy(
        env: Env,
        insurer: Address,
        patient: Address,
    ) -> Result<Policy, ContractError> {
        storage::policy(&env, &insurer, &patient)
    }

    pub fn submit_claim(
        env: Env,
        patient: Address,
        provider: Address,
        insurer: Address,
        claim_id: BytesN<32>,
        record_id: BytesN<32>,
        amount: i128,
        evidence_hash: BytesN<32>,
    ) -> Result<Claim, ContractError> {
        patient.require_auth();
        provider.require_auth();
        require_role(&env, &provider, Role::Provider)?;
        require_role(&env, &insurer, Role::Insurer)?;
        if amount <= 0 {
            return Err(ContractError::InvalidAmount);
        }
        if storage::claim_exists(&env, &claim_id) {
            return Err(ContractError::ClaimAlreadyExists);
        }
        let record = storage::record(&env, &record_id)?;
        require_owner(&record, &patient)?;
        if record.provider != provider {
            return Err(ContractError::UnauthorizedRole);
        }
        if !active_access(&env, &record_id, &insurer) {
            return Err(ContractError::AccessRequired);
        }
        let policy = storage::policy(&env, &insurer, &patient)?;
        if !policy.active || policy.valid_until <= env.ledger().timestamp() {
            return Err(ContractError::PolicyInactive);
        }
        if amount > policy.max_per_claim {
            return Err(ContractError::CoverageExceeded);
        }
        let claim = Claim {
            patient: patient.clone(),
            provider: provider.clone(),
            insurer: insurer.clone(),
            record_id,
            token: policy.token,
            amount,
            evidence_hash,
            submitted_at: env.ledger().timestamp(),
            status: ClaimStatus::Pending,
        };
        storage::put_claim(&env, &claim_id, &claim);
        ClaimSubmitted {
            patient,
            insurer,
            claim_id,
            provider,
            amount: claim.amount,
        }
        .publish(&env);
        Ok(claim)
    }

    pub fn approve_claim(
        env: Env,
        insurer: Address,
        claim_id: BytesN<32>,
    ) -> Result<Claim, ContractError> {
        insurer.require_auth();
        let mut claim = storage::claim(&env, &claim_id)?;
        if claim.insurer != insurer || claim.status != ClaimStatus::Pending {
            return Err(ContractError::InvalidClaimState);
        }
        claim.status = ClaimStatus::Approved;
        storage::put_claim(&env, &claim_id, &claim);
        ClaimApproved {
            insurer,
            claim_id,
            amount: claim.amount,
        }
        .publish(&env);
        Ok(claim)
    }

    pub fn reject_claim(
        env: Env,
        insurer: Address,
        claim_id: BytesN<32>,
        reason_hash: BytesN<32>,
    ) -> Result<Claim, ContractError> {
        insurer.require_auth();
        let mut claim = storage::claim(&env, &claim_id)?;
        if claim.insurer != insurer || claim.status != ClaimStatus::Pending {
            return Err(ContractError::InvalidClaimState);
        }
        claim.status = ClaimStatus::Rejected;
        storage::put_claim(&env, &claim_id, &claim);
        ClaimRejected {
            insurer,
            claim_id,
            reason_hash,
        }
        .publish(&env);
        Ok(claim)
    }

    pub fn cancel_claim(
        env: Env,
        patient: Address,
        claim_id: BytesN<32>,
    ) -> Result<Claim, ContractError> {
        patient.require_auth();
        let mut claim = storage::claim(&env, &claim_id)?;
        if claim.patient != patient || claim.status != ClaimStatus::Pending {
            return Err(ContractError::InvalidClaimState);
        }
        claim.status = ClaimStatus::Cancelled;
        storage::put_claim(&env, &claim_id, &claim);
        ClaimCancelled { patient, claim_id }.publish(&env);
        Ok(claim)
    }

    /// Atomically transfers configured stablecoin from insurer to provider.
    pub fn pay_claim(
        env: Env,
        insurer: Address,
        claim_id: BytesN<32>,
    ) -> Result<Claim, ContractError> {
        insurer.require_auth();
        let mut claim = storage::claim(&env, &claim_id)?;
        if claim.insurer != insurer || claim.status != ClaimStatus::Approved {
            return Err(ContractError::InvalidClaimState);
        }
        claim.status = ClaimStatus::Paid;
        storage::put_claim(&env, &claim_id, &claim);
        // State changes first. Failed token call rolls entire transaction back.
        token::Client::new(&env, &claim.token).transfer(&insurer, &claim.provider, &claim.amount);
        ClaimPaid {
            insurer,
            provider: claim.provider.clone(),
            claim_id,
            token: claim.token.clone(),
            amount: claim.amount,
        }
        .publish(&env);
        Ok(claim)
    }

    pub fn get_claim(env: Env, claim_id: BytesN<32>) -> Result<Claim, ContractError> {
        storage::claim(&env, &claim_id)
    }
}

#[cfg(test)]
mod test;
