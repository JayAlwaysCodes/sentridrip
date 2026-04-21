import { Router } from "express";
import { getDb } from "../db/database.js";
import { getSolPrice } from "../services/priceService.js";

const router = Router();

router.get("/strategy/:id", async (req, res) => {
  try {
    const db = getDb();
    const strategy = db.prepare("SELECT * FROM strategies WHERE id = ?").get(req.params.id);
    if (!strategy) return res.status(404).json({ success: false, error: "Strategy not found" });

    const txs = db.prepare(
      "SELECT * FROM transactions WHERE strategy_id = ? AND status = ? ORDER BY executed_at ASC"
    ).all(strategy.id, "success");

    const currentPrice = await getSolPrice();

    let totalUsdcSpent = 0;
    let totalSolReceived = 0;

    const txBreakdown = txs.map((tx) => {
      const usdcSpent = parseFloat(tx.amount_in || 0);
      const solReceived = tx.amount_out
        ? parseFloat(tx.amount_out.replace(/[^0-9.]/g, "")) || 0
        : usdcSpent / parseFloat(tx.sol_price_at_execution || currentPrice);

      totalUsdcSpent += usdcSpent;
      totalSolReceived += solReceived;

      const currentValue = solReceived * currentPrice;
      const pnl = currentValue - usdcSpent;
      const pnlPct = usdcSpent > 0 ? (pnl / usdcSpent) * 100 : 0;

      return {
        txHash: tx.tx_hash,
        executedAt: tx.executed_at,
        usdcSpent,
        solReceived: solReceived.toFixed(6),
        priceAtExecution: tx.sol_price_at_execution,
        currentValue: currentValue.toFixed(2),
        pnl: pnl.toFixed(2),
        pnlPct: pnlPct.toFixed(2),
      };
    });

    const totalCurrentValue = totalSolReceived * currentPrice;
    const totalPnl = totalCurrentValue - totalUsdcSpent;
    const totalPnlPct = totalUsdcSpent > 0 ? (totalPnl / totalUsdcSpent) * 100 : 0;
    const avgBuyPrice = totalSolReceived > 0 ? totalUsdcSpent / totalSolReceived : 0;
    const breakEvenPrice = avgBuyPrice;

    res.json({
      success: true,
      data: {
        strategyName: strategy.name,
        totalUsdcSpent: totalUsdcSpent.toFixed(2),
        totalSolReceived: totalSolReceived.toFixed(6),
        avgBuyPrice: avgBuyPrice.toFixed(2),
        currentSolPrice: currentPrice,
        totalCurrentValue: totalCurrentValue.toFixed(2),
        totalPnl: totalPnl.toFixed(2),
        totalPnlPct: totalPnlPct.toFixed(2),
        breakEvenPrice: breakEvenPrice.toFixed(2),
        isProfit: totalPnl >= 0,
        txCount: txs.length,
        transactions: txBreakdown,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
