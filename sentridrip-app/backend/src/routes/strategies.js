import { Router } from "express";
import { getDb } from "../db/database.js";
import { validatePolicies } from "../services/dcaService.js";
import { getLastKnownPrice } from "../services/priceService.js";
import { execFile } from "child_process";
import { promisify } from "util";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const execFileAsync = promisify(execFile);
const __dirname = dirname(fileURLToPath(import.meta.url));
const ZERION_CLI = join(__dirname, "../../../../cli/zerion.js");

const router = Router();

async function getWalletUsdcBalance(walletName) {
  try {
    const { stdout, stderr } = await execFileAsync(
      "node",
      [ZERION_CLI, "positions", "--wallet", walletName, "--chain", "solana", "--json"],
      {
        timeout: 15_000,
        env: {
          ...process.env,
          ZERION_API_KEY: process.env.ZERION_API_KEY,
          ZERION_AGENT_TOKEN: process.env.ZERION_AGENT_TOKEN,
          SOLANA_RPC_URL: process.env.SOLANA_RPC_URL,
        },
      }
    );

    const raw = stdout.trim();
    if (!raw) return { balance: 0, error: "No response from wallet" };

    const parsed = JSON.parse(raw);

    // Check if CLI returned an error
    if (parsed.error) {
      return { balance: 0, error: parsed.error.message || "Could not fetch wallet balance" };
    }

    const positions = parsed.data || parsed || [];

    // Empty positions means wallet exists but has no tokens
    if (!Array.isArray(positions) || positions.length === 0) {
      return { balance: 0, error: null };
    }

    const usdc = positions.find((p) => {
      const attr = p.attributes || p;
      const symbol = attr.fungible_info?.symbol || attr.symbol || "";
      return symbol.toUpperCase() === "USDC";
    });

    if (!usdc) return { balance: 0, error: null };

    const attr = usdc.attributes || usdc;
    const balance = parseFloat(attr.quantity?.float || 0);
    return { balance, error: null };
  } catch (err) {
    // If stdout has JSON error, extract it
    try {
      const match = (err.stdout || "").match(/\{[\s\S]*\}/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        if (parsed.error) {
          return { balance: 0, error: parsed.error.message || "Wallet fetch failed" };
        }
      }
    } catch (_) {}
    return { balance: 0, error: "Could not connect to wallet. Check your API key and wallet name." };
  }
}

router.get("/", (req, res) => {
  try {
    const db = getDb();
    const strategies = db.prepare("SELECT * FROM strategies ORDER BY created_at DESC").all();
    const result = strategies.map((s) => {
      const tiers = db.prepare(
        "SELECT * FROM strategy_tiers WHERE strategy_id = ? ORDER BY target_price DESC"
      ).all(s.id);
      return { ...s, tiers };
    });
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get("/:id", (req, res) => {
  try {
    const db = getDb();
    const strategy = db.prepare("SELECT * FROM strategies WHERE id = ?").get(req.params.id);
    if (!strategy) return res.status(404).json({ success: false, error: "Strategy not found" });
    const transactions = db.prepare(
      "SELECT * FROM transactions WHERE strategy_id = ? ORDER BY executed_at DESC LIMIT 50"
    ).all(strategy.id);
    const tiers = db.prepare(
      "SELECT * FROM strategy_tiers WHERE strategy_id = ? ORDER BY target_price DESC"
    ).all(strategy.id);
    res.json({ success: true, data: { ...strategy, transactions, tiers } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const {
      name, wallet_name, spend_limit, expiry_date,
      from_token = "USDC", to_token = "SOL", chain = "solana",
      tiers = [],
    } = req.body;

    // Input sanitization
    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return res.status(400).json({ success: false, error: "Strategy name is required" });
    }
    if (!wallet_name || typeof wallet_name !== "string" || !/^[a-zA-Z0-9_-]+$/.test(wallet_name)) {
      return res.status(400).json({ success: false, error: "Invalid wallet name" });
    }
    if (!spend_limit || !expiry_date) {
      return res.status(400).json({ success: false, error: "spend_limit and expiry_date are required" });
    }
    if (!tiers || tiers.length === 0) {
      return res.status(400).json({ success: false, error: "At least one price tier is required" });
    }
    if (tiers.length > 5) {
      return res.status(400).json({ success: false, error: "Maximum 5 tiers allowed" });
    }

    // Validate each tier
    for (let i = 0; i < tiers.length; i++) {
      const t = tiers[i];
      if (!t.target_price || !t.amount_per_buy) {
        return res.status(400).json({ success: false, error: "Tier " + (i + 1) + " needs a target price and amount" });
      }
      if (parseFloat(t.target_price) <= 0) {
        return res.status(400).json({ success: false, error: "Tier " + (i + 1) + " target price must be positive" });
      }
      if (parseFloat(t.amount_per_buy) < 1) {
        return res.status(400).json({ success: false, error: "Tier " + (i + 1) + " minimum amount is $1 USDC" });
      }
    }

    // Check for duplicate tier prices
    const tierPrices = tiers.map((t) => parseFloat(t.target_price));
    const uniquePrices = new Set(tierPrices);
    if (uniquePrices.size !== tierPrices.length) {
      return res.status(400).json({ success: false, error: "Each tier must have a unique target price" });
    }

    // Check tiers are in descending order
    for (let i = 1; i < tierPrices.length; i++) {
      if (tierPrices[i] >= tierPrices[i - 1]) {
        return res.status(400).json({
          success: false,
          error: "Tier prices must be in descending order (Tier 1 highest, last tier lowest)",
        });
      }
    }

    // Validate expiry
    if (new Date(expiry_date) <= new Date()) {
      return res.status(400).json({ success: false, error: "Expiry date must be in the future" });
    }

    // Calculate total spend
    const totalTierAmount = tiers.reduce((sum, t) => sum + parseFloat(t.amount_per_buy), 0);
    if (totalTierAmount > parseFloat(spend_limit)) {
      return res.status(400).json({
        success: false,
        error: "Total tier amounts ($" + totalTierAmount.toFixed(2) + ") exceed spend limit ($" + parseFloat(spend_limit).toFixed(2) + ")",
      });
    }

    // Check wallet USDC balance — always enforce, never skip
    const { balance: usdcBalance, error: balanceError } = await getWalletUsdcBalance(wallet_name);

    if (balanceError) {
      return res.status(400).json({
        success: false,
        error: "Could not verify wallet balance: " + balanceError + ". Please make sure your wallet is funded on Solana mainnet before creating a strategy.",
        insufficientFunds: true,
        walletBalance: "0.00",
        required: totalTierAmount.toFixed(2),
      });
    }

    if (usdcBalance <= 0) {
      return res.status(400).json({
        success: false,
        error: "Your wallet has no USDC balance. Please send USDC (SPL) to your Solana address before creating a strategy.",
        insufficientFunds: true,
        walletBalance: "0.00",
        required: totalTierAmount.toFixed(2),
      });
    }

    if (usdcBalance < totalTierAmount) {
      return res.status(400).json({
        success: false,
        error: "Insufficient USDC balance. Wallet has $" + usdcBalance.toFixed(2) + " USDC but this strategy needs $" + totalTierAmount.toFixed(2) + ". Reduce your tier amounts or fund your wallet.",
        insufficientFunds: true,
        walletBalance: usdcBalance.toFixed(2),
        required: totalTierAmount.toFixed(2),
      });
    }

    const lowestTier = tiers.reduce((min, t) =>
      parseFloat(t.target_price) < parseFloat(min.target_price) ? t : min, tiers[0]);
    const highestAmount = tiers.reduce((max, t) =>
      parseFloat(t.amount_per_buy) > parseFloat(max.amount_per_buy) ? t : max, tiers[0]);

    const db = getDb();
    const result = db.prepare(
      `INSERT INTO strategies (name, wallet_name, from_token, to_token, amount_per_buy, target_price, spend_limit, expiry_date, chain)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      name.trim(), wallet_name, from_token, to_token,
      String(highestAmount.amount_per_buy),
      parseFloat(lowestTier.target_price),
      String(totalTierAmount.toFixed(2)),
      expiry_date, chain
    );

    const strategyId = result.lastInsertRowid;

    for (let i = 0; i < tiers.length; i++) {
      const t = tiers[i];
      db.prepare(
        `INSERT INTO strategy_tiers (strategy_id, tier_number, target_price, amount_per_buy)
         VALUES (?, ?, ?, ?)`
      ).run(strategyId, i + 1, parseFloat(t.target_price), String(t.amount_per_buy));
    }

    const strategy = db.prepare("SELECT * FROM strategies WHERE id = ?").get(strategyId);
    const savedTiers = db.prepare(
      "SELECT * FROM strategy_tiers WHERE strategy_id = ? ORDER BY target_price DESC"
    ).all(strategyId);

    res.status(201).json({ success: true, data: { ...strategy, tiers: savedTiers } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.patch("/:id/pause", (req, res) => {
  try {
    const db = getDb();
    const s = db.prepare("SELECT * FROM strategies WHERE id = ?").get(req.params.id);
    if (!s) return res.status(404).json({ success: false, error: "Not found" });
    if (s.status === "completed") {
      return res.status(400).json({ success: false, error: "Cannot pause a completed strategy" });
    }
    db.prepare(
      "UPDATE strategies SET status = 'paused', updated_at = datetime('now') WHERE id = ?"
    ).run(req.params.id);
    res.json({ success: true, data: { id: req.params.id, status: "paused" } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.patch("/:id/resume", (req, res) => {
  try {
    const db = getDb();
    const s = db.prepare("SELECT * FROM strategies WHERE id = ?").get(req.params.id);
    if (!s) return res.status(404).json({ success: false, error: "Not found" });
    if (s.status === "completed") {
      return res.status(400).json({ success: false, error: "Cannot resume a completed strategy" });
    }
    db.prepare(
      "UPDATE strategies SET status = 'active', updated_at = datetime('now') WHERE id = ?"
    ).run(req.params.id);
    res.json({ success: true, data: { id: req.params.id, status: "active" } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.delete("/:id", (req, res) => {
  try {
    const db = getDb();
    const s = db.prepare("SELECT * FROM strategies WHERE id = ?").get(req.params.id);
    if (!s) return res.status(404).json({ success: false, error: "Not found" });
    db.prepare("DELETE FROM strategy_tiers WHERE strategy_id = ?").run(req.params.id);
    db.prepare("DELETE FROM transactions WHERE strategy_id = ?").run(req.params.id);
    db.prepare("DELETE FROM strategies WHERE id = ?").run(req.params.id);
    res.json({ success: true, message: "Strategy deleted" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get("/:id/policy-status", (req, res) => {
  try {
    const db = getDb();
    const strategy = db.prepare("SELECT * FROM strategies WHERE id = ?").get(req.params.id);
    if (!strategy) return res.status(404).json({ success: false, error: "Not found" });

    const tiers = db.prepare(
      "SELECT * FROM strategy_tiers WHERE strategy_id = ? ORDER BY target_price DESC"
    ).all(strategy.id);

    const currentPrice = getLastKnownPrice();
    if (!currentPrice) {
      return res.json({ success: true, data: { status: "unknown", reason: "Price not yet fetched" } });
    }

    const policy = validatePolicies(strategy, currentPrice);
    const totalSpent = parseFloat(strategy.total_spent || "0");
    const spendLimit = parseFloat(strategy.spend_limit);

    const tierStatus = tiers.map((t) => ({
      tier: t.tier_number,
      targetPrice: t.target_price,
      amountPerBuy: t.amount_per_buy,
      totalSpent: t.total_spent,
      totalBuys: t.total_buys,
      status: t.status,
      priceConditionMet: currentPrice <= t.target_price,
    }));

    const anyTierActive = tierStatus.some((t) => t.priceConditionMet && t.status === "active");

    res.json({
      success: true,
      data: {
        allowed: policy.allowed,
        reason: policy.reason,
        currentPrice,
        priceConditionMet: anyTierActive,
        spendProgress: {
          spent: totalSpent,
          limit: spendLimit,
          remaining: spendLimit - totalSpent,
          percentUsed: ((totalSpent / spendLimit) * 100).toFixed(1),
        },
        expiresAt: strategy.expiry_date,
        isExpired: new Date(strategy.expiry_date) <= new Date(),
        tiers: tierStatus,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
