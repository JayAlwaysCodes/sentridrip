import cron from "node-cron";
import { getSolPrice } from "./priceService.js";
import { runDcaExecution } from "./dcaService.js";
import { getDb } from "../db/database.js";

let _isRunning = false;

export function startScheduler() {
  if (!process.env.ZERION_API_KEY) {
    console.warn("[Scheduler] WARNING: ZERION_API_KEY not set. Scheduler will run but swaps will fail.");
  }

  console.log("[Scheduler] Starting DCA price monitor (every 60s)...");

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

      for (const strategy of activeStrategies) {
        try {
          await runDcaExecution(strategy, currentPrice);
        } catch (err) {
          console.error("[Scheduler] Error for strategy " + strategy.name + ": " + err.message);
        }
      }

      // Cleanup price history older than 24 hours to prevent unbounded growth
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
