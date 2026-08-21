use super::*;
use soroban_sdk::{testutils::Address as _, testutils::Ledger, token, Address, BytesN, Env};

struct Fixture {
    env: Env,
    contract_id: Address,
    admin: Address,
    patient: Address,
    provider: Address,
    insurer: Address,
}

impl Fixture {
    fn new() -> Self {
        let env = Env::default();
        env.mock_all_auths();
        env.ledger().set_timestamp(1_000);
        let contract_id = env.register(MedicalRecordsContract, ());
        let admin = Address::generate(&env);
        let patient = Address::generate(&env);
        let provider = Address::generate(&env);
        let insurer = Address::generate(&env);
        let client = MedicalRecordsContractClient::new(&env, &contract_id);
        client.initialize(&admin);
        client.set_role(&provider, &Role::Provider, &true);
        client.set_role(&insurer, &Role::Insurer, &true);
        Self {
            env,
            contract_id,
            admin,
            patient,
            provider,
            insurer,
        }
    }

    fn id(&self, byte: u8) -> BytesN<32> {
        BytesN::from_array(&self.env, &[byte; 32])
    }

    fn client(&self) -> MedicalRecordsContractClient<'_> {
        MedicalRecordsContractClient::new(&self.env, &self.contract_id)
    }

    fn register_record(&self) -> BytesN<32> {
        let id = self.id(1);
        self.client()
            .register_record(&self.patient, &self.provider, &id, &self.id(2), &self.id(3));
        id
    }
}

#[test]
fn initializes_roles_and_record() {
    let f = Fixture::new();
    let client = f.client();
    assert_eq!(client.admin(), f.admin);
    assert_eq!(client.role_of(&f.provider), Some(Role::Provider));

    let record_id = f.register_record();
    let record = client.get_record(&record_id);
    assert_eq!(record.patient, f.patient);
    assert_eq!(record.key_version, 1);
}

#[test]
fn grants_expires_revokes_and_rotation_invalidates() {
    let f = Fixture::new();
    let client = f.client();
    let record_id = f.register_record();
    client.grant_access(&f.patient, &record_id, &f.insurer, &2_000, &f.id(4));
    assert!(client.has_access(&record_id, &f.insurer));

    f.env.ledger().set_timestamp(2_000);
    assert!(!client.has_access(&record_id, &f.insurer));

    f.env.ledger().set_timestamp(1_100);
    client.grant_access(&f.patient, &record_id, &f.insurer, &3_000, &f.id(5));
    client.rotate_record(&f.patient, &record_id, &f.id(6), &f.id(7));
    assert!(!client.has_access(&record_id, &f.insurer));

    client.grant_access(&f.patient, &record_id, &f.insurer, &3_000, &f.id(8));
    client.revoke_access(&f.patient, &record_id, &f.insurer);
    assert!(!client.has_access(&record_id, &f.insurer));
}

#[test]
fn claim_requires_policy_access_and_coverage() {
    let f = Fixture::new();
    let client = f.client();
    let record_id = f.register_record();
    let token = Address::generate(&f.env);

    client.set_policy(&f.insurer, &f.patient, &token, &1_000, &5_000, &true);
    client.grant_access(&f.patient, &record_id, &f.insurer, &4_000, &f.id(9));
    let claim = client.submit_claim(
        &f.patient,
        &f.provider,
        &f.insurer,
        &f.id(10),
        &record_id,
        &750,
        &f.id(11),
    );
    assert_eq!(claim.status, ClaimStatus::Pending);
    assert_eq!(
        client.approve_claim(&f.insurer, &f.id(10)).status,
        ClaimStatus::Approved
    );
}

#[test]
fn rejects_claim_over_policy_limit() {
    let f = Fixture::new();
    let client = f.client();
    let record_id = f.register_record();
    let token = Address::generate(&f.env);
    client.set_policy(&f.insurer, &f.patient, &token, &100, &5_000, &true);
    client.grant_access(&f.patient, &record_id, &f.insurer, &4_000, &f.id(12));

    assert_eq!(
        client.try_submit_claim(
            &f.patient,
            &f.provider,
            &f.insurer,
            &f.id(13),
            &record_id,
            &101,
            &f.id(14),
        ),
        Err(Ok(ContractError::CoverageExceeded))
    );
}

#[test]
fn approved_claim_pays_provider_atomically() {
    let f = Fixture::new();
    let client = f.client();
    let record_id = f.register_record();
    let token_admin = Address::generate(&f.env);
    let asset = f.env.register_stellar_asset_contract_v2(token_admin);
    let token_address = asset.address();
    let token_admin_client = token::StellarAssetClient::new(&f.env, &token_address);
    let token_client = token::Client::new(&f.env, &token_address);
    token_admin_client.mint(&f.insurer, &2_000);

    client.set_policy(
        &f.insurer,
        &f.patient,
        &token_address,
        &1_000,
        &5_000,
        &true,
    );
    client.grant_access(&f.patient, &record_id, &f.insurer, &4_000, &f.id(15));
    client.submit_claim(
        &f.patient,
        &f.provider,
        &f.insurer,
        &f.id(16),
        &record_id,
        &750,
        &f.id(17),
    );
    client.approve_claim(&f.insurer, &f.id(16));

    let paid = client.pay_claim(&f.insurer, &f.id(16));
    assert_eq!(paid.status, ClaimStatus::Paid);
    assert_eq!(token_client.balance(&f.insurer), 1_250);
    assert_eq!(token_client.balance(&f.provider), 750);
}
