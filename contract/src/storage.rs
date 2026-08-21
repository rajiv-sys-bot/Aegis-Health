use soroban_sdk::{Address, BytesN, Env};

use crate::types::{AccessGrant, Claim, ContractError, DataKey, MedicalRecord, Policy, Role};

const TTL_THRESHOLD: u32 = 500_000;
const TTL_BUMP: u32 = 1_000_000;

fn bump(env: &Env, key: &DataKey) {
    env.storage()
        .persistent()
        .extend_ttl(key, TTL_THRESHOLD, TTL_BUMP);
}

pub fn set_admin(env: &Env, admin: &Address) {
    let key = DataKey::Admin;
    env.storage().persistent().set(&key, admin);
    bump(env, &key);
}

pub fn admin(env: &Env) -> Result<Address, ContractError> {
    let key = DataKey::Admin;
    let value = env
        .storage()
        .persistent()
        .get(&key)
        .ok_or(ContractError::NotInitialized)?;
    bump(env, &key);
    Ok(value)
}

pub fn set_role(env: &Env, account: &Address, role: &Role) {
    let key = DataKey::Role(account.clone());
    env.storage().persistent().set(&key, role);
    bump(env, &key);
}

pub fn remove_role(env: &Env, account: &Address) {
    env.storage()
        .persistent()
        .remove(&DataKey::Role(account.clone()));
}

pub fn role(env: &Env, account: &Address) -> Option<Role> {
    let key = DataKey::Role(account.clone());
    let value = env.storage().persistent().get(&key);
    if value.is_some() {
        bump(env, &key);
    }
    value
}

pub fn put_record(env: &Env, id: &BytesN<32>, record: &MedicalRecord) {
    let key = DataKey::Record(id.clone());
    env.storage().persistent().set(&key, record);
    bump(env, &key);
}

pub fn record(env: &Env, id: &BytesN<32>) -> Result<MedicalRecord, ContractError> {
    let key = DataKey::Record(id.clone());
    let value = env
        .storage()
        .persistent()
        .get(&key)
        .ok_or(ContractError::RecordNotFound)?;
    bump(env, &key);
    Ok(value)
}

pub fn record_exists(env: &Env, id: &BytesN<32>) -> bool {
    env.storage().persistent().has(&DataKey::Record(id.clone()))
}

pub fn put_grant(env: &Env, record_id: &BytesN<32>, grantee: &Address, grant: &AccessGrant) {
    let key = DataKey::Grant(record_id.clone(), grantee.clone());
    env.storage().persistent().set(&key, grant);
    bump(env, &key);
}

pub fn grant(env: &Env, record_id: &BytesN<32>, grantee: &Address) -> Option<AccessGrant> {
    let key = DataKey::Grant(record_id.clone(), grantee.clone());
    let value = env.storage().persistent().get(&key);
    if value.is_some() {
        bump(env, &key);
    }
    value
}

pub fn remove_grant(env: &Env, record_id: &BytesN<32>, grantee: &Address) -> bool {
    let key = DataKey::Grant(record_id.clone(), grantee.clone());
    let existed = env.storage().persistent().has(&key);
    if existed {
        env.storage().persistent().remove(&key);
    }
    existed
}

pub fn put_policy(env: &Env, policy: &Policy) {
    let key = DataKey::Policy(policy.insurer.clone(), policy.patient.clone());
    env.storage().persistent().set(&key, policy);
    bump(env, &key);
}

pub fn policy(env: &Env, insurer: &Address, patient: &Address) -> Result<Policy, ContractError> {
    let key = DataKey::Policy(insurer.clone(), patient.clone());
    let value = env
        .storage()
        .persistent()
        .get(&key)
        .ok_or(ContractError::PolicyNotFound)?;
    bump(env, &key);
    Ok(value)
}

pub fn put_claim(env: &Env, id: &BytesN<32>, claim: &Claim) {
    let key = DataKey::Claim(id.clone());
    env.storage().persistent().set(&key, claim);
    bump(env, &key);
}

pub fn claim(env: &Env, id: &BytesN<32>) -> Result<Claim, ContractError> {
    let key = DataKey::Claim(id.clone());
    let value = env
        .storage()
        .persistent()
        .get(&key)
        .ok_or(ContractError::ClaimNotFound)?;
    bump(env, &key);
    Ok(value)
}

pub fn claim_exists(env: &Env, id: &BytesN<32>) -> bool {
    env.storage().persistent().has(&DataKey::Claim(id.clone()))
}
