import { Router } from "express";
import { getDb } from "../db/database.js";
import { validatePolicies } from "../services/dcaService.js";
import { getLastKnownPrice } from "../services/priceService.js";

const router = Router();

router.get("/", (req, res) => {
  try {
    const db = getDb();
    const strategies = db.prepare("SELECT * FROM strategies ORDER BY created_at DESC").all();
    const result = strategies.map((s) => {
      const tiers = db.prepare("SELECT * FROM strategy_tiers WHERE strategy_id = ? ORDER BY target_price DESC").all(s.id);
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
    const transactions = db.prepare("SELECT * FROM transactions WHERE strategy_id = ? ORDER BY executed_at DESC LIMIT 50").all(strategy.id);
    const tiers = db.prepare("SELECT * FROM strategy_tiers WHERE strategy_id = ? ORDER BY target_price DESC").all(strategy.id);
    res.json({ success: true, data: { ...strategy, transactions, tiers } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post("/", (req, res) => {
  try {
    const {
      name, wallet_name, spend_limit, expiry_date,
      from_token = "USDC", to_token = "SOL", chain = "solana",
      tiers = [],
    } = req.body;

    if (!name || !wallet_name || !spend_limit || !expiry_date) {
      return res.status(400).json({ success: false, error: "Missing required fields: name, wallet_name, spend_limit, expiry_date" });
    }
    if (!tiers || tiers.length === 0) {
      return res.status(400).json({ success: false, error: "At least one price tier is required" });
    }
    if (tiers.length > 5) {
      return res.status(400).json({ success: false, error: "Maximum 5 tiers allowed" });
    }
    for (const t of tiers) {
      if (!t.target_price || !t.amount_per_buy) {
        return res.status(400).json({ success: false, error: "Each tier needs a target_price and amount_per_buy" });
      }
      if (parseFloat(t.target_price) <= 0 || parseFloat(t.amount_per_buy) <= 0) {
        return res.status(400).json({ success: false, error: "Tier prices and amounts must be positive" });
      }
    }

    const totalTierAmount = tiers.reduce((sum, t) => sum + parseFloat(t.amount_per_buy), 0);
    if (totalTierAmount > parseFloat(spend_limit)) {
      return res.status(400).json({ success: false, error: "Total tier amounts ($" + totalTierAmount.toFixed(2) + ") exceed spend limit ($" + parseFloat(spend_limit).toFixed(2) + ")" });
    }
    if (new Date(expiry_date) <= new Date()) {
      return res.status(400).json({ success: false, error: "expiry_date must be in the future" });
    }

    const lowestTier = tiers.reduce((min, t) => parseFloat(t.target_price) < parseFloat(min.target_price) ? t : min, tiers[0]);
    const highestAmount = tiers.reduce((max, t) => parseFloat(t.amount_per_buy) > parseFloat(max.amount_per_buy) ? t : max, tiers[0]);

    const db = getDb();
    const result = db.prepare(
      `INSERT INTO strategies (name, wallet_name, from_token, to_token, amount_per_buy, target_price, spend_limit, expiry_date, chain)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(name, wallet_name, from_token, to_token, String(highestAmount.amount_per_buy), parseFloat(lowestTier.target_price), String(spend_limit), expiry_date, chain);

    const strategyId = result.lastInsertRowid;

    for (let i = 0; i < tiers.length; i++) {
      const t = tiers[i];
      db.prepare(
        `INSERT INTO strategy_tiers (strategy_id, tier_number, target_price, amount_per_buy)
         VALUES (?, ?, ?, ?)`
      ).run(strategyId, i + 1, parseFloat(t.target_price), String(t.amount_per_buy));
    }

    const strategy = db.prepare("SELECT * FROM strategies WHERE id = ?").get(strategyId);
    const savedTiers = db.prepare("SELECT * FROM strategy_tiers WHERE strategy_id = ? ORDER BY target_price DESC").all(strategyId);

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
    if (s.status === "completed") return res.status(400).json({ success: false, error: "Cannot pause completed strategy" });
    db.prepare("UPDATE strategies SET status = 'paused', updated_at = datetime('now') WHERE id = ?").run(req.params.id);
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
    if (s.status === "completed") return res.status(400).json({ success: false, error: "Cannot resume completed strategy" });
    db.prepare("UPDATE strategies SET status = 'active', updated_at = datetime('now') WHERE id = ?").run(req.params.id);
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
    const tiers = db.prepare("SELECT * FROM strategy_tiers WHERE strategy_id = ? ORDER BY target_price DESC").all(strategy.id);

    const currentPrice = getLastKnownPrice();
    if (!currentPrice) return res.json({ success: true, data: { status: "unknown", reason: "Price not yet fetched" } });

    const policy = validatePolicies(strategy, currentPrice);
    const totalSpent = parseFloat(strategy.total_spent || "0");
    const spendLimit = parseFloat(strategy.spend_limit);

    const activeTiers = tiers.map((t) => ({
      tier: t.tier_number,
      targetPrice: t.target_price,
      amountPerBuy: t.amount_per_buy,
      totalSpent: t.total_spent,
      totalBuys: t.total_buys,
      status: t.status,
      priceConditionMet: currentPrice <= t.target_price,
    }));

    res.json({
      success: true,
      data: {
        allowed: policy.allowed,
        reason: policy.reason,
        currentPrice,
        priceConditionMet: currentPrice <= strategy.target_price,
        spendProgress: {
          spent: totalSpent,
          limit: spendLimit,
          remaining: spendLimit - totalSpent,
          percentUsed: ((totalSpent / spendLimit) * 100).toFixed(1),
        },
        expiresAt: strategy.expiry_date,
        isExpired: new Date(strategy.expiry_date) <= new Date(),
        tiers: activeTiers,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
