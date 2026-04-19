# SentriDrip 🛡️💧

> **Set your price. SentriDrip does the rest.**

SentriDrip is an autonomous onchain DCA (Dollar-Cost Averaging) agent built on top of the [Zerion CLI](https://github.com/zeriontech/zerion-ai). It monitors the SOL price in real time and automatically executes USDC → SOL swaps when your target price is hit — all within scoped policies that keep the agent safe.

Built for the **Zerion CLI Hackathon**.

---

## What It Does

- **Autonomous DCA Bot** — Set a target SOL price, amount per buy, spend limit and expiry. The agent runs every 60 seconds checking the price and executing swaps automatically when conditions are met.
- **Manual Swap** — Instantly swap SOL ↔ USDC on demand via the web UI.
- **Wallet Manager** — Create and manage Solana wallets, view portfolio and positions directly in the browser.
- **Scoped Policies** — Every transaction is checked against 4 enforced policies before execution. No god-mode agents.
- **Real Onchain Transactions** — All swaps route through the Zerion API on Solana mainnet.

---

## Architecture

┌─────────────────────────────────────┐
│         React Web App               │
│    Dashboard · Wallets · Swap       │
└────────────────┬────────────────────┘
│ REST API
┌────────────────▼────────────────────┐
│       Node.js + Express Backend     │
│                                     │
│  ┌─────────────┐  ┌──────────────┐  │
│  │  node-cron  │  │ Policy Engine│  │
│  │  60s loop   │  │ (4 policies) │  │
│  └──────┬──────┘  └──────────────┘  │
│         │                           │
│  ┌──────▼──────────────────────┐    │
│  │    Zerion CLI (forked)      │    │
│  │  wallet + swap execution    │    │
│  └─────────────────────────────┘    │
│                                     │
│  ┌──────────────┐                   │
│  │  SQLite DB   │                   │
│  │  (Prisma)    │                   │
│  └──────────────┘                   │
└────────────────┬────────────────────┘
│
┌────────────┴───────────┐
│                        │
┌───▼────────┐    ┌─────────▼───────┐
│ CoinGecko  │    │   Zerion API    │
│ Price Feed │    │ (swap routing)  │
└────────────┘    └─────────────────┘

---

## Scoped Policies

SentriDrip enforces 4 policies before every transaction. All are defined in `cli/policies/`:

| Policy | File | What It Does |
|---|---|---|
| **Chain Lock** | `chain-lock.mjs` | Restricts execution to Solana only. No EVM leakage. |
| **Spend Limit** | `spend-limit.mjs` | Blocks swaps that would exceed the configured USDC budget. |
| **Expiry Window** | `expiry-window.mjs` | Blocks execution after the strategy expiry date. |
| **Deny Transfers** | `deny-transfers.mjs` | Blocks raw native transfers — only DEX swaps allowed. |

If any policy fails, the transaction is blocked. No exceptions.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Execution layer | Zerion CLI (forked) |
| Backend | Node.js + Express |
| Scheduler | node-cron (60s interval) |
| Database | SQLite via better-sqlite3 |
| Price feed | CoinGecko free API |
| Frontend | React + Tailwind CSS |
| Blockchain | Solana (mainnet) |
| Swap routing | Zerion API |

---

## Getting Started

### Prerequisites

- Node.js v20+
- A Zerion API key from [dashboard.zerion.io](https://dashboard.zerion.io)

### 1. Clone the repo

```bash
git clone https://github.com/JayAlwaysCodes/sentridrip.git
cd sentridrip
git checkout merge-wallet-cli
npm install
```

### 2. Set up environment variables

```bash
cp .env.example sentridrip-app/backend/.env
# Edit sentridrip-app/backend/.env and fill in your keys
```

### 3. Create a wallet

```bash
export ZERION_API_KEY=your_key_here
node cli/zerion.js wallet create --name my-wallet
node cli/zerion.js agent create-token --name my-bot --wallet my-wallet
```

### 4. Fund your wallet

Send SOL and/or USDC (SPL) to your Solana wallet address shown after creation. Both SOL and USDC go to the same Solana address.

### 5. Start the backend

```bash
cd sentridrip-app/backend
npm install
npm run dev
```

### 6. Start the frontend

```bash
cd sentridrip-app/frontend
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

---

## Project Structure
sentridrip/
├── cli/                          # Forked Zerion CLI
│   ├── commands/                 # wallet, trading, agent, analytics
│   ├── lib/                      # Shared utilities
│   └── policies/                 # Policy engine
│       ├── chain-lock.mjs        # ← SentriDrip custom policy
│       ├── spend-limit.mjs       # ← SentriDrip custom policy
│       ├── expiry-window.mjs     # ← SentriDrip custom policy
│       ├── deny-transfers.mjs    # Built-in policy
│       └── run-policies.mjs      # Policy dispatcher
│
└── sentridrip-app/
├── backend/
│   ├── src/
│   │   ├── server.js         # Express entry point
│   │   ├── db/               # SQLite schema
│   │   ├── routes/           # strategies, wallet, price, swap
│   │   └── services/         # DCA engine, price feed, scheduler
│   └── .env.example
│
└── frontend/
└── src/
├── App.jsx
└── pages/
├── Dashboard.jsx       # Strategy overview
├── CreateStrategy.jsx  # New DCA strategy form
├── StrategyDetail.jsx  # Live policy status + tx history
├── WalletPage.jsx      # Wallet manager + portfolio
└── SwapPage.jsx        # Manual swap interface

---

## How the DCA Bot Works

1. User creates a strategy via the web UI — sets target price, amount per buy, spend limit, expiry date
2. Backend saves the strategy to SQLite
3. `node-cron` runs every 60 seconds, fetching SOL price from CoinGecko
4. For each active strategy, the policy engine validates:
   - Is the strategy still active and not expired?
   - Has the spend limit been reached?
   - Is SOL price at or below the target?
   - Is the chain Solana?
5. If all policies pass → Zerion CLI executes the swap onchain
6. Transaction hash, amount out, and SOL price at execution are recorded in SQLite
7. Web UI shows live policy status, transaction history, and spend progress

---

## Demo

> Live demo and video coming soon.

---

## Hackathon Submission

- **Track:** Zerion CLI Hackathon
- **Interface:** Web App
- **Chain:** Solana (mainnet)
- **Policies implemented:** Chain lock, spend limit, expiry window, deny transfers
- **Real onchain transactions:** Yes — all swaps route through Zerion API

---

## License

MIT