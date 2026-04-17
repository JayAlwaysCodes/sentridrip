import { Router } from "express";
import { getDb } from "../db/database.js";
import { validatePolicies } from "../services/dcaService.js";
import { getLastKnownPrice } from "../services/priceService.js";

const router = Router();

router.get("/", (req, res) => {
  try {
    const db = getDb();
    const strategies = db.prepare("SELECT * FROM strategies ORDER BY created_at DESC").all();
    res.json({ success: true, data: strategies });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get("/:id", (req, res) => {
  try {
    const db = getDb();
    const strategy = db.prepare("SELECT * FROM strategies WHERE id = ?").get(req.params.id);
    if (!strategy) return res.status(404).json({ success: false, error: "Strategy not found" });
    const transactions = db
      .prepare("SELECT * FROM transactions WHERE strategy_id = ? ORDER BY executed_at DESC LIMIT 50")
      .all(strategy.id);
    res.json({ success: true, data: { ...strategy, transactions } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post("/", (req, res) => {
  try {
    const {
      name, wallet_name, amount_per_buy, target_price, spend_limit,
      expiry_date, max_buys = null, from_token = "USDC", to_token = "SOL", chain = "solana",
    } = req.body;

    if (!name || !wallet_name || !amount_per_buy || !target_price || !spend_limit || !expiry_date) {
      return res.status(400).json({ success: false, error: "Missing required fields" });
    }
    if (parseFloat(amount_per_buy) > parseFloat(spend_limit)) {
      return res.status(400).json({ success: false, error: "amount_per_buy cannot exceed spend_limit" });
    }
    if (new Date(expiry_date) <= new Date()) {
      return res.status(400).json({ success: false, error: "expiry_date must be in the future" });
    }

    const db = getDb();
    const result = db
      .prepare(
        `INSERT INTO strategies (name, wallet_name, from_token, to_token, amount_per_buy, target_price, spend_limit, expiry_date, chain, max_buys)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(name, wallet_name, from_token, to_token, String(amount_per_buy), parseFloat(target_price), String(spend_limit), expiry_date, chain, max_buys);

    const strategy = db.prepare("SELECT * FROM strategies WHERE id = ?").get(result.lastInsertRowid);
    res.status(201).json({ success: true, data: strategy });
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

    const currentPrice = getLastKnownPrice();
    if (!currentPrice) return res.json({ success: true, data: { status: "unknown", reason: "Price not yet fetched" } });

    const policy = validatePolicies(strategy, currentPrice);
    const totalSpent = parseFloat(strategy.total_spent || "0");
    const spendLimit = parseFloat(strategy.spend_limit);

    res.json({
      success: true,
      data: {
        allowed: policy.allowed,
        reason: policy.reason,
        currentPrice,
        targetPrice: strategy.target_price,
        priceConditionMet: currentPrice <= strategy.target_price,
        spendProgress: {
          spent: totalSpent,
          limit: spendLimit,
          remaining: spendLimit - totalSpent,
          percentUsed: ((totalSpent / spendLimit) * 100).toFixed(1),
        },
        expiresAt: strategy.expiry_date,
        isExpired: new Date(strategy.expiry_date) <= new Date(),
        buysProgress: strategy.max_buys ? { done: strategy.total_buys, max: strategy.max_buys } : null,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
