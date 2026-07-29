# Aegis Health

Patient-owned health records and consent controls secured by Stellar Soroban.

## Getting started

Install dependencies and start the development server:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

- `npm run dev` — start local development server
- `npm run build` — create production build
- `npm run start` — serve production build
- `npm run lint` — run ESLint
- `npm run setup` — deploy the contract to testnet, seed records/grants/claims, and write `.env.local`
- `npm run smoke` — compile bindings, then verify config, RPC, and the deployed contract answer reads
- `npm run bindings:build` — regenerate TS bindings from the contract schema
