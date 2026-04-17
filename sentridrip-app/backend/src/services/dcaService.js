import { execFile } from "child_process";
import { promisify } from "util";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { getDb } from "../db/database.js";

const execFileAsync = promisify(execFile);
const __dirname = dirname(fileURLToPath(import.meta.url));
const ZERION_CLI = join(__dirname, "../../../../../cli/zerion.js");

export function validatePolicies(strategy, currentPrice) {
  const now = new Date();

  const expiry = new Date(strategy.expiry_date);
  if (now > expiry) {
    return { allowed: false, reason: "Strategy has expired" };
  }

  const totalSpent = parseFloat(strategy.total_spent || "0");
  const spendLimit = parseFloat(strategy.spend_limit);
  const amountPerBuy = parseFloat(strategy.amount_per_buy);
  if (totalSpent + amountPerBuy > spendLimit) {
    return {
      allowed: false,
      reason: `Spend limit reached: $${totalSpent.toFixed(2)} / $${spendLimit.toFixed(2)}`,
    };
  }

  if (strategy.max_buys !== null && strategy.total_buys >= strategy.max_buys) {
    return {
      allowed: false,
      reason: `Max buys reached: ${strategy.total_buys} / ${strategy.max_buys}`,
    };
  }

  if (strategy.chain !== "solana") {
    return { allowed: false, reason: "Chain lock violation: only solana allowed" };
  }

  if (currentPrice > strategy.target_price) {
    return {
      allowed: false,
      reason: `SOL price $${currentPrice} is above target $${strategy.target_price}`,
    };
  }

  return { allowed: true, reason: null };
}

export async function executeSwapViaCli(strategy) {
  const args = [
    ZERION_CLI,
    "swap",
    strategy.from_token,
    strategy.to_token,
    strategy.amount_per_buy,
    "--chain",
    strategy.chain,
    "--wallet",
    strategy.wallet_name,
    "--json",
  ];

  try {
    const { stdout, stderr } = await execFileAsync("node", args, {
      timeout: 60_000,
      env: { ...process.env },
    });

    if (stderr && !stdout) throw new Error(stderr.trim());

    const result = JSON.parse(stdout.trim());
    return { success: true, result };
  } catch (err) {
    let message = err.message;
    try {
      const parsed = JSON.parse(err.stdout || err.message);
      message = parsed?.error?.message || message;
    } catch (_) {}
    return { success: false, error: message };
  }
}

export async function runDcaExecution(strategy, currentPrice) {
  const db = getDb();

  const policy = validatePolicies(strategy, currentPrice);
  if (!policy.allowed) {
    console.log(`[DCA] Strategy "${strategy.name}" blocked: ${policy.reason}`);

    if (
      policy.reason.includes("expired") ||
      policy.reason.includes("Spend limit") ||
      policy.reason.includes("Max buys")
    ) {
      db.prepare(
        "UPDATE strategies SET status = 'completed', updated_at = datetime('now') WHERE id = ?"
      ).run(strategy.id);
    }
    return { executed: false, reason: policy.reason };
  }

  console.log(
    `[DCA] Executing: ${strategy.amount_per_buy} ${strategy.from_token} → ${strategy.to_token} @ SOL $${currentPrice}`
  );

  const txRecord = db
    .prepare(
      `INSERT INTO transactions (strategy_id, from_token, to_token, amount_in, sol_price_at_execution, status)
       VALUES (?, ?, ?, ?, ?, 'pending')`
    )
    .run(strategy.id, strategy.from_token, strategy.to_token, strategy.amount_per_buy, currentPrice);

  const txId = txRecord.lastInsertRowid;
  const { success, result, error } = await executeSwapViaCli(strategy);

  if (success) {
    const txHash = result?.tx?.hash || null;
    const amountOut = result?.swap?.to || null;

    db.prepare(
      `UPDATE transactions SET tx_hash = ?, amount_out = ?, status = 'success', executed_at = datetime('now') WHERE id = ?`
    ).run(txHash, amountOut, txId);

    const newTotalSpent = (
      parseFloat(strategy.total_spent) + parseFloat(strategy.amount_per_buy)
    ).toFixed(6);

    db.prepare(
      `UPDATE strategies SET total_spent = ?, total_buys = total_buys + 1, updated_at = datetime('now') WHERE id = ?`
    ).run(newTotalSpent, strategy.id);

    console.log(`[DCA] ✅ Swap done. Tx: ${txHash}`);
    return { executed: true, txHash, amountOut };
  } else {
    db.prepare(
      `UPDATE transactions SET status = 'failed', error = ?, executed_at = datetime('now') WHERE id = ?`
    ).run(error, txId);

    console.error(`[DCA] ❌ Swap failed: ${error}`);
    return { executed: false, error };
  }
}
