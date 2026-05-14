# SentriDrip 🛡️💧

> **Set your price. SentriDrip does the rest.**

SentriDrip is an autonomous onchain DCA (Dollar-Cost Averaging) agent built on top of the [Zerion CLI](https://github.com/zeriontech/zerion-ai). It monitors the SOL price in real time and automatically executes USDC → SOL swaps when your target price is hit — all within scoped policies that keep the agent safe.

Built for the **Zerion CLI Hackathon — Frontier Track**.

🌐 **Live Demo:** [sentridrip.vercel.app](https://sentridrip.vercel.app) (Password: `SentriDrip2024!`)
📦 **Backend:** [sentridrip-backend.onrender.com](https://sentridrip-backend.onrender.com)
🔗 **Funded Wallet:** [Ci1yx9ZKnVcbgnJMpt9VANaHdUVGH7mr3qGLiU4JCAP3](https://solscan.io/account/Ci1yx9ZKnVcbgnJMpt9VANaHdUVGH7mr3qGLiU4JCAP3)

---

## What It Does

- **Autonomous DCA Bot** — Set multiple price targets with different buy amounts per tier. The agent runs every 60 seconds, checks the SOL price, and executes USDC → SOL swaps automatically when conditions are met.
- **Multi-Tier Price Targeting** — Set up to 5 independent price levels, each with its own buy amount. Buy $5 at $85, $10 at $80, $20 at $75 — all automated.
- **Manual Swap** — Instantly swap SOL ↔ USDC on demand via the web UI using Jupiter DEX aggregator.
- **Wallet Manager** — Create and manage Solana wallets, view portfolio and positions directly in the browser.
- **Scoped Policies** — 4 enforced policies before every transaction. No god-mode agents.
- **Telegram Notifications** — Get instant alerts when swaps execute, strategies complete, or tiers trigger.
- **PnL Tracker** — Real-time profit and loss per strategy, average buy price, current value vs amount spent.
- **Real Onchain Transactions** — All swaps route through the Zerion API and Jupiter DEX on Solana mainnet.

---

## Funded Wallet

The SentriDrip mainnet wallet has been funded and verified on Solana mainnet:

| Field | Value |
|---|---|
| Wallet Name | SentriDrip-Mainnet |
| Solana Address | `Ci1yx9ZKnVcbgnJMpt9VANaHdUVGH7mr3qGLiU4JCAP3` |
| Network | Solana Mainnet |
| Funded By | Bybit Wallet |
| Solscan | [View Account](https://solscan.io/account/Ci1yx9ZKnVcbgnJMpt9VANaHdUVGH7mr3qGLiU4JCAP3) |

---

## Architecture
Browser (React + Tailwind)
|
| REST API
v
Node.js + Express Backend

node-cron (60s price check loop)
Policy engine (4 policies enforced)
Zerion CLI subprocess (wallet + swap)
Jupiter DEX API (Solana swap fallback)
SQLite database (strategies + tx history)
Telegram Bot (real-time notifications)
|
|---> CoinGecko API + Binance (SOL price)
|---> Zerion API (swap routing)
|---> Jupiter DEX API (Solana swaps)
|---> Solana RPC (balance + portfolio)


---

## Scoped Policies

SentriDrip enforces 4 policies before every transaction. All defined in `cli/policies/`:

| Policy | File | What It Does |
|---|---|---|
| **Chain Lock** | `chain-lock.mjs` | Restricts all execution to Solana only. No EVM leakage. |
| **Spend Limit** | `spend-limit.mjs` | Blocks any swap that would exceed the configured USDC budget. |
| **Expiry Window** | `expiry-window.mjs` | Automatically deactivates the strategy after the set date. |
| **Deny Transfers** | `deny-transfers.mjs` | Blocks raw native transfers — only DEX swaps allowed. |

If any policy fails, the transaction is blocked. No exceptions.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Execution layer | Zerion CLI (forked) |
| Solana swaps | Jupiter DEX Aggregator (lite-api) |
| Backend | Node.js + Express |
| Scheduler | node-cron (60s interval) |
| Database | SQLite via better-sqlite3 |
| Price feed | CoinGecko + Binance (fallback) |
| Notifications | Telegram Bot API |
| Frontend | React + Tailwind CSS + Recharts |
| Blockchain | Solana (mainnet) |
| Hosting | Render (backend) + Vercel (frontend) |
| Uptime | UptimeRobot (5min ping) |

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

### 3. Create a wallet and agent token

```bash
export ZERION_API_KEY=your_key_here
node cli/zerion.js wallet create --name my-wallet
node cli/zerion.js agent create-token --name my-bot --wallet my-wallet
```

### 4. Fund your wallet

Send SOL and/or USDC (SPL) to your Solana wallet address.
Both SOL and USDC go to the same Solana address.

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
│   └── policies/
│       ├── chain-lock.mjs        # SentriDrip custom policy
│       ├── spend-limit.mjs       # SentriDrip custom policy
│       ├── expiry-window.mjs     # SentriDrip custom policy
│       ├── deny-transfers.mjs    # Built-in policy
│       └── run-policies.mjs      # Policy dispatcher
│
└── sentridrip-app/
├── backend/
│   ├── src/
│   │   ├── server.js              # Express entry point
│   │   ├── db/                    # SQLite schema
│   │   ├── routes/                # strategies, wallet, price, swap, pnl
│   │   └── services/
│   │       ├── dcaService.js      # DCA execution engine
│   │       ├── jupiterService.js  # Jupiter DEX integration
│   │       ├── priceService.js    # SOL price feed
│   │       ├── scheduler.js       # 60s cron loop
│   │       └── telegramService.js # Telegram notifications
│   └── .env.example
│
└── frontend/
└── src/
├── App.jsx
├── components/
│   ├── AuthGate.jsx       # Password protection
│   ├── PriceChart.jsx     # Live SOL chart
│   └── PnLPanel.jsx       # PnL tracker
└── pages/
├── Dashboard.jsx
├── CreateStrategy.jsx
├── StrategyDetail.jsx
├── WalletPage.jsx
└── SwapPage.jsx

---

## How the DCA Bot Works

1. User creates a strategy via the web UI with multiple price tiers, spend limit and expiry
2. Backend saves the strategy and tiers to SQLite
3. node-cron runs every 60 seconds fetching SOL price from CoinGecko
4. For each active strategy, all 4 policies are validated
5. Each tier is evaluated independently — if SOL price is at or below the tier target, the swap executes
6. Zerion CLI executes the swap (with Jupiter DEX as Solana fallback)
7. Transaction hash, amount out and SOL price at execution are saved to SQLite
8. Telegram notification sent instantly
9. Web UI shows live policy status, transaction history, PnL and spend progress

---

## Telegram Bot

SentriDrip sends real-time Telegram notifications for:

- Agent startup
- New strategy created
- Price target reached (tier about to execute)
- Swap executed successfully (with Solscan link)
- Swap failed (with reason)
- Strategy completed (all tiers done or spend limit hit)

Bot: [@SentriDripBot](https://t.me/SentriDripBot)

---

## Security

- Password-protected web UI (AuthGate)
- API rate limiting via express-rate-limit
- Input sanitization on all wallet names and strategy fields
- Wallet passphrase never transmitted — stays in Zerion CLI keystore
- Agent token stored in CLI config, never exposed to frontend
- All policies enforced server-side before any transaction

---

## Hackathon Submission

- **Track:** Zerion CLI Hackathon — Frontier Track
- **Interface:** Web App + Telegram Bot
- **Chain:** Solana (mainnet)
- **Policies:** Chain lock, spend limit, expiry window, deny transfers
- **Real onchain transactions:** Yes — funded wallet verified on Solscan
- **Swap routing:** Zerion API + Jupiter DEX fallback

---

## License

MIT