# Stellar challenge submission checklist

Use this file as the final evidence index. Replace every `TODO` only with evidence from the current deployment. Keep claims current; never reuse old transaction hashes or stale user counts.

## Level 3 — Orange Belt

| Requirement | Repository evidence | Final evidence |
| --- | --- | --- |
| Advanced smart contract logic | `contract/src/lib.rs` | `DONE: link to contract address` |
| Inter-contract communication | SAC payout in `pay_claim` | `DONE: transaction hash` |
| Events / real-time updates | `lib/events.ts`, `hooks/use-contract-events.ts` | `DONE: audit screenshot` |
| CI/CD | `.github/workflows/ci.yml` | `DONE: CI run URL + screenshot` |
| Deployment workflow | `scripts/setup.sh` | `DONE: deployment transaction` |
| Mobile frontend | `app/`, responsive Tailwind layouts | `DONE: mobile screenshot` |
| Loading and error states | `components/health-ui.tsx` | `DONE: UI screenshot` |
| Tests | `contract/src/test.rs` — 5 tests | `DONE: passing test output screenshot` |
| Documentation | `README.md` | `DONE: repository URL` |
| Live demo | App routes and testnet config | `TODO: live deployment URL` |
| Demo video | Not stored in repository | `TODO: 1–2 minute video URL` |

## Level 4 — Green Belt

| Requirement | Status / evidence to add |
| --- | --- |
| Production-ready MVP | `DONE: deploy stable build and verify all routes` |
| 10 real users | `TODO: attach wallet interaction proof; do not fabricate` |
| User feedback | `TODO: Google Form URL + exported sheet URL` |
| Monitoring and analytics | `TODO: add provider dashboard screenshot and explain privacy boundaries` |
| Product UI | `TODO: current desktop screenshot` |
| Mobile UI | `TODO: current phone screenshot` |
| Contract testnet address | `TODO: current C... address` |
| Live demo | `TODO: current deployment URL` |
| Demo video | `TODO: walkthrough URL` |

## Level 5 — Blue Belt

| Requirement | Status / evidence to add |
| --- | --- |
| 50 testnet users | `TODO: current wallet list / interaction export` |
| Real transaction activity | `TODO: current analytics screenshot + explorer links` |
| Feedback collection | `TODO: Google Form with name, email, wallet, rating, feedback` |
| Excel export | `TODO: view-only exported .xlsx or Google Sheet URL` |
| Feedback-driven improvements | `TODO: summary + GitHub commit links for each change` |
| Pitch deck | `TODO: PPT / Google Slides URL` |
| Full product walkthrough | `TODO: video URL` |
| Updated README | `DONE: keep this evidence index current` |

## Suggested feedback form fields

Collect only what testers consent to provide:

- Name or alias
- Email, if follow-up is needed
- Stellar wallet address
- Which role they tested: patient, clinic, insurer
- Product rating from 1–5
- What worked well
- Where they got stuck
- Feature request
- Consent to use anonymized feedback in the submission

Do not collect medical diagnoses, treatment details, reports, or other real health information in this testnet demo.

## Demo recording outline

1. Connect Freighter on Stellar testnet.
2. Show patient record and grant access with an expiry.
3. Show clinic request and live grant verification.
4. Revoke access and show the changed ledger state.
5. Show insurer claim approval and atomic payout.
6. Open Audit log, filter an event, open its explorer transaction, and finish with the contract address.
