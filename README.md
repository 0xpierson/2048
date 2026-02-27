# OPNet 2048

Bitcoin L1 2048 game project built with OPNet.

This repository includes:
- An AssemblyScript smart contract that stores player/game score data
- A React + Vite frontend for the 2048 gameplay and on-chain interactions

## Project Structure

```text
.
├── contracts/
│   └── game-2048/
└── frontend/
    └── game-2048/
```

## Prerequisites

- Node.js 20+ (recommended)
- npm
- OP_WALLET browser extension (for wallet connection and signing)

## Contract (`contracts/game-2048`)

Build the OPNet contract:

```bash
cd contracts/game-2048
npm install
npm run build
```

Useful scripts:
- `npm run build` - compile contract to Wasm
- `npm run lint` - lint source
- `npm run format` - format project files

## Frontend (`frontend/game-2048`)

Set the contract address in `.env`:

```env
VITE_GAME2048_CONTRACT_ADDRESS=0x...
```

Install and run:

```bash
cd frontend/game-2048
npm install
npm run dev
```

Other scripts:
- `npm run build` - production build
- `npm run preview` - preview production build
- `npm run lint` - eslint
- `npm run typecheck` - TypeScript checks
- `npm run test` - Vitest tests

## Typical Local Workflow

1. Build/update contract in `contracts/game-2048`
2. Deploy contract to OPNet testnet
3. Update `VITE_GAME2048_CONTRACT_ADDRESS` in `frontend/game-2048/.env`
4. Start frontend with `npm run dev`

## Notes

- Use OPNet testnet RPC when testing (`https://testnet.opnet.org`).
- Frontend transaction signing is handled by OP_WALLET.
