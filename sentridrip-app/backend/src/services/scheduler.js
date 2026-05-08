import cron from "node-cron";
import { getSolPrice } from "./priceService.js";
import { runDcaExecution } from "./dcaService.js";
import { getDb } from "../db/database.js";
import { notifyStartup, notifyPriceCheck } from "./telegramService.js";

let _isRunning = false;

export function startScheduler() {
  if (!process.env.ZERION_API_KEY) {
    console.warn("[Scheduler] WARNING: ZERION_API_KEY not set.");
  }

  console.log("[Scheduler] Starting DCA price monitor (every 60s)...");

  notifyStartup().catch(() => {});

  cron.schedule("* * * * *", async () => {
    if (_isRunning) {
      console.log("[Scheduler] Previous run still in progress, skipping...");
      return;
    }
    _isRunning = true;

    try {
      const currentPrice = await getSolPrice();
      console.log("[Scheduler] SOL price: $" + currentPrice);

      const db = getDb();
      const activeStrategies = db
        .prepare("SELECT * FROM strategies WHERE status = ? ORDER BY created_at ASC")
        .all("active");

      if (activeStrategies.length === 0) return;

      console.log("[Scheduler] Checking " + activeStrategies.length + " active strategy(ies)...");

      let totalTiersReady = 0;
      for (const strategy of activeStrategies) {
        const tiers = db.prepare(
          "SELECT * FROM strategy_tiers WHERE strategy_id = ? AND status = ? ORDER BY target_price DESC"
        ).all(strategy.id, "active");

        const tiersReady = tiers.filter((t) => currentPrice <= t.target_price).length;
        totalTiersReady += tiersReady;
      }

      if (totalTiersReady > 0) {
        await notifyPriceCheck({
          solPrice: currentPrice.toFixed(2),
          strategiesChecked: activeStrategies.length,
          tiersReady: totalTiersReady,
        });
      }

      for (const strategy of activeStrategies) {
        try {
          await runDcaExecution(strategy, currentPrice);
        } catch (err) {
          console.error("[Scheduler] Error for strategy " + strategy.name + ": " + err.message);
        }
      }

      // Cleanup price history older than 24 hours
      db.prepare(
        "DELETE FROM price_history WHERE recorded_at < datetime('now', '-24 hours')"
      ).run();

    } catch (err) {
      console.error("[Scheduler] Error in DCA loop: " + err.message);
    } finally {
      _isRunning = false;
    }
  });

  console.log("[Scheduler] DCA price monitor started");
}
