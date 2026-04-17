import cron from "node-cron";
import { getSolPrice } from "./priceService.js";
import { runDcaExecution } from "./dcaService.js";
import { getDb } from "../db/database.js";

let _isRunning = false;

export function startScheduler() {
  console.log("[Scheduler] Starting DCA price monitor (every 60s)...");

  cron.schedule("* * * * *", async () => {
    if (_isRunning) {
      console.log("[Scheduler] Previous run still in progress, skipping...");
      return;
    }
    _isRunning = true;

    try {
      const currentPrice = await getSolPrice();
      console.log(`[Scheduler] SOL price: $${currentPrice}`);

      const db = getDb();
      const activeStrategies = db
        .prepare("SELECT * FROM strategies WHERE status = 'active' ORDER BY created_at ASC")
        .all();

      if (activeStrategies.length === 0) return;

      console.log(`[Scheduler] Checking ${activeStrategies.length} active strategy(ies)...`);

      for (const strategy of activeStrategies) {
        try {
          await runDcaExecution(strategy, currentPrice);
        } catch (err) {
          console.error(`[Scheduler] Error for "${strategy.name}": ${err.message}`);
        }
      }
    } catch (err) {
      console.error(`[Scheduler] Error in DCA loop: ${err.message}`);
    } finally {
      _isRunning = false;
    }
  });

  console.log("[Scheduler] DCA price monitor started ✅");
}
