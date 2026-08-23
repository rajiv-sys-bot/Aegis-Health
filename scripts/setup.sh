#!/usr/bin/env bash
#
# Aegis Health — one-command testnet setup.
#
# Deploys the medical-records contract to Stellar testnet, configures roles,
# deploys a demo SAC token, and seeds records / grants / claims so every
# dashboard renders real on-chain data.
#
# Usage:
#   npm run setup                          # fully self-contained demo
#   npm run setup -- --patient G...ABC     # use YOUR Freighter address as patient
#   npm run setup -- --skip-build          # reuse the existing wasm build
#
# Outputs:
#   .env.local                          — ids + pubkeys consumed by the app
#   scripts/aegis-accounts.local.env    — seeded secrets (chmod 600, gitignored)
#                                         Import these into Freighter to click
#                                         through every role in the demo.

set -euo pipefail

cd "$(dirname "$0")/.."

NETWORK="testnet"
PATIENT_OVERRIDE=""
SKIP_BUILD=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --patient) PATIENT_OVERRIDE="$2"; shift 2 ;;
    --skip-build) SKIP_BUILD=1; shift ;;
    *) echo "Unknown flag: $1" >&2; exit 1 ;;
  esac
done

say()  { printf "\033[1;36m▸ %s\033[0m\n" "$1"; }
warn() { printf "\033[1;33m  ! %s\033[0m\n" "$1"; }
die()  { printf "\033[1;31m✗ %s\033[0m\n" "$1" >&2; exit 1; }

command -v stellar >/dev/null 2>&1 || die "stellar CLI not found. Install: https://developers.stellar.org/docs/tools/developer-tools/stellar-cli"

# ---------------------------------------------------------------------------
# 1. Identities (reused across runs; funded via friendbot)
# ---------------------------------------------------------------------------
ensure_identity() {
  local name="$1"
  if ! stellar keys ls 2>/dev/null | grep -qx "$name"; then
    say "Creating identity $name"
    stellar keys generate "$name" --fund --network "$NETWORK" >/dev/null 2>&1 \
      || stellar keys generate "$name" --network "$NETWORK" >/dev/null 2>&1
  fi
  stellar keys fund "$name" --network "$NETWORK" >/dev/null 2>&1 || true
}

ensure_identity aegis-admin
ensure_identity aegis-provider
ensure_identity aegis-insurer
ensure_identity aegis-patient

ADMIN=$(stellar keys public-key aegis-admin)
PROVIDER=$(stellar keys public-key aegis-provider)
INSURER=$(stellar keys public-key aegis-insurer)
DEMO_PATIENT=$(stellar keys public-key aegis-patient)

EXTERNAL_PATIENT=0
if [[ -n "$PATIENT_OVERRIDE" ]]; then
  [[ "$PATIENT_OVERRIDE" =~ ^G[A-Z2-7]{55}$ ]] || die "--patient must be a G… account id (got $PATIENT_OVERRIDE)"
  PATIENT="$PATIENT_OVERRIDE"
  EXTERNAL_PATIENT=1
else
  PATIENT="$DEMO_PATIENT"
fi

NOW=$(date +%s)
DAY=86400

# ---------------------------------------------------------------------------
# 2. Build + deploy a FRESH contract each run (clean, predictable state)
# ---------------------------------------------------------------------------
if [[ $SKIP_BUILD -eq 0 ]]; then
  say "Building contract (cargo → wasm32v1-none)"
  (cd contract && stellar contract build) >/dev/null
fi
WASM="contract/target/wasm32v1-none/release/medical_records_contract.wasm"
[[ -f "$WASM" ]] || die "wasm not found at $WASM (run without --skip-build once)"

say "Deploying contract to testnet"
CID=$(stellar contract deploy --wasm "$WASM" -s aegis-admin --alias aegis-medical --network "$NETWORK") \
  || die "contract deploy failed"
[[ "$CID" =~ ^C[A-Z0-9]{55}$ ]] || die "deploy returned an invalid contract id: $CID"

invoke() { # invoke <signer> [extra signer flags…] -- fn --arg v …
  local source="$1"; shift
  stellar contract invoke --id "$CID" --source-account "$source" --network "$NETWORK" "$@"
}

# Two-signer calls (register_record / submit_claim need patient + provider
# auth). The stellar CLI can't attach co-signature auth entries, so these go
# through a small Node script using the stellar-sdk directly.
ensure_bindings() {
  if [[ ! -f lib/medical-contract/dist/index.js ]]; then
    say "Compiling contract TS bindings"
    (cd lib/medical-contract && npx tsc) >/dev/null
  fi
}

invoke_multi() { # invoke_multi register <recordId> <contentHash> <locatorHash>
                 # invoke_multi submit  <claimId>  <recordId>   <amount> <evidenceHash>
  ensure_bindings
  AEGIS_CONTRACT_ID="$CID" \
  AEGIS_RPC_URL="https://soroban-testnet.stellar.org" \
  AEGIS_NETWORK_PASSPHRASE="Test SDF Network ; September 2015" \
  AEGIS_PATIENT_SECRET="$(stellar keys secret aegis-patient)" \
  AEGIS_PROVIDER_SECRET="$(stellar keys secret aegis-provider)" \
    node scripts/seed-multi.mjs "$@" >/dev/null
}

say "Initializing contract + roles"
invoke aegis-admin -- initialize --admin "$ADMIN" >/dev/null 2>&1 || warn "initialize skipped (already initialized)"
invoke aegis-admin -- set_role --account "$PROVIDER" --role Provider --enabled true >/dev/null
invoke aegis-admin -- set_role --account "$INSURER" --role Insurer --enabled true >/dev/null

# ---------------------------------------------------------------------------
# 3. Demo settlement token (SAC, 7 decimals) + funding for the insurer
# ---------------------------------------------------------------------------
say "Ensuring demo token AEG (SAC)"
# The SAC address is derived from the asset, so it persists across runs —
# compute it and only deploy when it doesn't exist yet.
TOKEN=$(node -e '
  const { Asset, Networks } = require("@stellar/stellar-sdk");
  console.log(new Asset(process.argv[1], process.argv[2]).contractId(Networks.TESTNET));
' AEG "$ADMIN")
if ! stellar contract invoke --id "$TOKEN" -s aegis-admin --network "$NETWORK" --send=no -- name >/dev/null 2>&1; then
  TOKEN=$(stellar contract asset deploy --asset "AEG:$ADMIN" -s aegis-admin --alias aegis-token --network "$NETWORK") \
    || die "asset deploy failed"
fi

# SAC payouts move classic balances: recipients need a trustline to the asset.
say "Opening AEG trustlines (insurer receives mint, provider receives claim payouts)"
for who in aegis-insurer aegis-provider; do
  stellar tx new change-trust --source-account "$who" --line "AEG:$ADMIN" --network "$NETWORK" >/dev/null
done

stellar contract invoke --id "$TOKEN" --source-account aegis-admin --network "$NETWORK" \
  -- mint --to "$INSURER" --amount 1000000000000 >/dev/null

# ---------------------------------------------------------------------------
# 4. Seed data. register_record / submit_claim / grant_access require the
#    PATIENT's signature — only possible when we hold the patient key.
# ---------------------------------------------------------------------------
if [[ $EXTERNAL_PATIENT -eq 1 ]]; then
  warn "Patient is your Freighter address ($PATIENT), so patient-signed seeds (records, grants, claims) were skipped."
  warn "Register records with your co-signature — see 'Multi-signer flows' in README — or re-run without --patient to get the full demo."
  invoke aegis-provider -- request_access --requester "$PROVIDER" \
    --record-id "$(printf 'clinic-request-%s' "$NOW" | shasum -a 256 | cut -d' ' -f1)" \
    --requested-until "$((NOW + DAY))" >/dev/null 2>&1 || true
else
  rand32() { printf '%s-%s' "$1" "$NOW$RANDOM" | shasum -a 256 | cut -d' ' -f1; }

  R1=$(rand32 "record-bloodpanel");   H1=$(rand32 "content-$R1"); L1=$(rand32 "locator-$R1")
  R2=$(rand32 "record-imaging");      H2=$(rand32 "content-$R2"); L2=$(rand32 "locator-$R2")
  R3=$(rand32 "record-discharge");    H3=$(rand32 "content-$R3"); L3=$(rand32 "locator-$R3")

  say "Registering 3 records (patient + provider co-signed)"
  for pair in "$R1 $H1 $L1" "$R2 $H2 $L2" "$R3 $H3 $L3"; do
    set -- $pair
    invoke_multi register "$1" "$2" "$3"
  done

  say "Granting insurer access to record 1 (expires in 7 days)"
  invoke aegis-patient -- grant_access --patient "$PATIENT" --record-id "$R1" \
    --grantee "$INSURER" --expires-at "$((NOW + 7 * DAY))" \
    --key-commitment "$(rand32 "commitment-$R1")" >/dev/null

  say "Granting insurer access to record 2 (expires in 7 days)"
  invoke aegis-patient -- grant_access --patient "$PATIENT" --record-id "$R2" \
    --grantee "$INSURER" --expires-at "$((NOW + 7 * DAY))" \
    --key-commitment "$(rand32 "commitment-$R2")" >/dev/null

  say "Provider requests access to record 2"
  invoke aegis-provider -- request_access --requester "$PROVIDER" \
    --record-id "$R2" --requested-until "$((NOW + DAY))" >/dev/null

  say "Setting insurance policy (max 50 AEG per claim, 30 days)"
  invoke aegis-insurer -- set_policy --insurer "$INSURER" --patient "$PATIENT" \
    --token "$TOKEN" --max-per-claim 500000000 \
    --valid-until "$((NOW + 30 * DAY))" --active true >/dev/null

  say "Seeding claims: one Paid, one Pending"
  C1=$(rand32 "claim-physio"); C2=$(rand32 "claim-lab")
  invoke_multi submit "$C1" "$R1" 425000000 "$INSURER" "$(rand32 "evidence-$C1")"
  invoke aegis-insurer -- approve_claim --insurer "$INSURER" --claim-id "$C1" >/dev/null
  invoke aegis-insurer -- pay_claim --insurer "$INSURER" --claim-id "$C1" >/dev/null
  invoke_multi submit "$C2" "$R2" 120000000 "$INSURER" "$(rand32 "evidence-$C2")"
fi

# ---------------------------------------------------------------------------
# 5. Write config + account files
# ---------------------------------------------------------------------------
say "Writing .env.local and scripts/aegis-accounts.local.env"
cat > .env.local <<EOF
# Generated by scripts/setup.sh on $(date -u +%Y-%m-%dT%H:%M:%SZ). Re-run setup to refresh.
NEXT_PUBLIC_CONTRACT_ID=$CID
NEXT_PUBLIC_RPC_URL=https://soroban-testnet.stellar.org
NEXT_PUBLIC_TOKEN_ID=$TOKEN
NEXT_PUBLIC_DEMO_ADMIN=$ADMIN
NEXT_PUBLIC_DEMO_PATIENT=$PATIENT
NEXT_PUBLIC_DEMO_PROVIDER=$PROVIDER
NEXT_PUBLIC_DEMO_INSURER=$INSURER
EOF

SECRETS_FILE="scripts/aegis-accounts.local.env"
{
  echo "# Seeded testnet secrets — import into Freighter to demo each role."
  echo "# NEVER commit this file."
  echo "AEGIS_ADMIN_SECRET=$(stellar keys secret aegis-admin)"
  echo "AEGIS_PROVIDER_SECRET=$(stellar keys secret aegis-provider)"
  echo "AEGIS_INSURER_SECRET=$(stellar keys secret aegis-insurer)"
  if [[ $EXTERNAL_PATIENT -eq 0 ]]; then
    echo "AEGIS_PATIENT_SECRET=$(stellar keys secret aegis-patient)"
  fi
} > "$SECRETS_FILE"
chmod 600 "$SECRETS_FILE"

# ---------------------------------------------------------------------------
# 6. Sanity read + summary
# ---------------------------------------------------------------------------
READBACK=$(stellar contract invoke --id "$CID" --source-account aegis-admin --network "$NETWORK" --send=no -- admin 2>/dev/null | tail -1)
[[ "$READBACK" == *"$ADMIN"* ]] || warn "admin() readback unexpected: $READBACK"

echo
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Aegis Health is live on testnet"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  contract   $CID"
echo "  token      $TOKEN"
echo "  admin      $ADMIN"
echo "  patient    $PATIENT$([ $EXTERNAL_PATIENT -eq 1 ] && echo '  (your Freighter address)')"
echo "  provider   $PROVIDER"
echo "  insurer    $INSURER"
echo "──────────────────────────────────────────────────────────────"
echo "  next:  npm run dev   → http://localhost:3000"
echo "  demo:  import secrets from $SECRETS_FILE into Freighter"
echo "         (patient / provider / insurer / admin), stay on Testnet."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
