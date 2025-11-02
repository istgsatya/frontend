# Transparent Cents (Frontend)

Next.js 14 App Router + TypeScript app implementing the Transparent Cents UI.

## Tech
- Next.js (App Router)
- Tailwind CSS
- Zustand (persist)
- Axios for API
- ethers.js for MetaMask and on-chain actions (Sepolia)

## Backend & Proxy
- Backend base URL: http://localhost:8080
- All frontend calls use baseURL `/api`, which is proxied to the backend via Next.js rewrites.

## Setup

1) Install dependencies

```sh
npm install
```

2) Configure env

Create `.env.local` (optional) and set contract address if you have it:

```
NEXT_PUBLIC_CONTRACT_ADDRESS=0xYourSepoliaContractAddress
```

3) Start dev

```sh
npm run dev
```

## ABI
Replace `public/PlatformLedger.json` with the real ABI file provided by Satya.

## Notes
- Images/files from the API are loaded from `http://localhost:8080/uploads/*`.
- Charity dashboard is protected in the client by role `ROLE_CHARITY_ADMIN`.
- Wallet Registration banner appears until `user.wallets.length > 0`.
