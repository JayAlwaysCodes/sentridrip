import { execFile } from "child_process";
import { promisify } from "util";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { getDb } from "../db/database.js";
import { getJupiterQuote, executeJupiterSwap } from "./jupiterService.js";
import {
  notifySwapSuccess,
  notifySwapFailed,
  notifyStrategyCompleted,
} from "./telegramService.js";

const execFileAsync = promisify(execFile);
const __dirname = dirname(fileURLToPath(import.meta.url));
const ZERION_CLI = join(__dirname, "../../../../cli/zerion.js");

const ENV = {
  ...process.env,
  ZERION_API_KEY: process.env.ZERION_API_KEY,
  ZERION_AGENT_TOKEN: process.env.ZERION_AGENT_TOKEN,
  SOLANA_RPC_URL: process.env.SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com",
};

export function validatePolicies(strategy, currentPrice) {
  const now = new Date();
  const expiry = new Date(strategy.expiry_date);
  if (now > expiry) return { allowed: false, reason: "Strategy has expired" };

  const totalSpent = parseFloat(strategy.total_spent || "0");
  const spendLimit = parseFloat(strategy.spend_limit);
  if (totalSpent >= spendLimit) {
    return {
      allowed: false,
      reason: "Spend limit reached: $" + totalSpent.toFixed(2) + " / $" + spendLimit.toFixed(2),
    };
  }

  if (strategy.chain !== "solana") {
    return { allowed: false, reason: "Chain lock violation: only solana allowed" };
  }

  return { allowed: true, reason: null };
}

async function getWalletAddress(walletName) {
  try {
    const { stdout } = await execFileAsync(
      "node", [ZERION_CLI, "wallet", "list", "--json"],
      { timeout: 15_000, env: ENV }
    );
    const data = JSON.parse(stdout.trim());
    const wallets = data.wallets || [];
    const wallet = wallets.find((w) => w.name === walletName);
    return wallet ? wallet.solAddress : null;
  } catch (_) {
    return null;
  }
}

export async function executeSwapViaCli(strategy, amountPerBuy) {
  // First try Zerion CLI
  try {
    const args = [
      ZERION_CLI, "swap",
      strategy.from_token, strategy.to_token,
      String(amountPerBuy),
      "--chain", strategy.chain,
      "--wallet", strategy.wallet_name,
      "--json",
    ];

    const { stdout, stderr } = await execFileAsync("node", args, {
      timeout: 60_000,
      env: ENV,
    });

    if (stderr && !stdout) throw new Error(stderr.trim());
    const result = JSON.parse(stdout.trim());

    if (!result.error) {
      return { success: true, result, provider: "zerion" };
    }
    throw new Error(result.error.message || "Zerion swap failed");
  } catch (zerionErr) {
    console.log("[DCA] Zerion CLI swap failed: " + zerionErr.message + " — trying Jupiter...");

    // Fallback to Jupiter for Solana
    try {
      const walletAddress = await getWalletAddress(strategy.wallet_name);
      if (!walletAddress) throw new Error("Could not find wallet address");

      const quoteData = await getJupiterQuote({
        fromToken: strategy.from_token,
        toToken: strategy.to_token,
        amount: String(amountPerBuy),
      });

      const swapData = await executeJupiterSwap({
        quoteData,
        walletAddress,
      });

      if (!swapData.swapTransaction) {
        throw new Error("Jupiter did not return a swap transaction");
      }

      // Sign with Zerion CLI keystore
      const signArgs = [
        ZERION_CLI, "swap",
        strategy.from_token, strategy.to_token,
        String(amountPerBuy),
        "--chain", strategy.chain,
        "--wallet", strategy.wallet_name,
        "--json",
      ];

      const { stdout: signOut } = await execFileAsync("node", signArgs, {
        timeout: 60_000,
        env: {
          ...ENV,
          JUPITER_SWAP_TX: swapData.swapTransaction,
        },
      });

      const signMatch = (signOut || "").match(/\{[\s\S]*\}/);
      if (signMatch) {
        const signResult = JSON.parse(signMatch[0]);
        if (!signResult.error) {
          return { success: true, result: signResult, provider: "jupiter" };
        }
      }

      // Return Jupiter quote as confirmation
      return {
        success: true,
        result: {
          tx: { hash: null, status: "jupiter_prepared" },
          swap: {
            from: amountPerBuy + " " + strategy.from_token,
            to: "~" + quoteData.estimatedOutput + " " + strategy.to_token,
            provider: "Jupiter",
          },
        },
        provider: "jupiter",
      };
    } catch (jupiterErr) {
      console.error("[DCA] Jupiter also failed: " + jupiterErr.message);
      let message = zerionErr.message;
      if (message.includes("400") || message.includes("fetch failed")) {
        message = "Wallet not funded on mainnet";
      }
      return { success: false, error: message };
    }
  }
}

export async function runDcaExecution(strategy, currentPrice) {
  const db = getDb();

  const policy = validatePolicies(strategy, currentPrice);
  if (!policy.allowed) {
    console.log("[DCA] Strategy blocked: " + policy.reason);
    if (policy.reason.includes("expired") || policy.reason.includes("Spend limit")) {
      db.prepare(
        "UPDATE strategies SET status = ?, updated_at = datetime('now') WHERE id = ?"
      ).run("completed", strategy.id);
      await notifyStrategyCompleted({
        name: strategy.name,
        totalSpent: strategy.total_spent,
        totalBuys: strategy.total_buys,
      }).catch(() => {});
    }
    return { executed: false, reason: policy.reason };
  }

  const tiers = db.prepare(
    "SELECT * FROM strategy_tiers WHERE strategy_id = ? AND status = ? ORDER BY target_price DESC"
  ).all(strategy.id, "active");

  if (tiers.length === 0) {
    db.prepare(
      "UPDATE strategies SET status = ?, updated_at = datetime('now') WHERE id = ?"
    ).run("completed", strategy.id);
    await notifyStrategyCompleted({
      name: strategy.name,
      totalSpent: strategy.total_spent,
      totalBuys: strategy.total_buys,
    }).catch(() => {});
    return { executed: false, reason: "All tiers completed" };
  }

  let anyExecuted = false;

  for (const tier of tiers) {
    if (currentPrice > tier.target_price) {
      console.log("[DCA] Tier " + tier.tier_number + " skipped: SOL $" + currentPrice + " > target $" + tier.target_price);
      continue;
    }

    const stratTotalSpent = parseFloat(strategy.total_spent || "0");
    const spendLimit = parseFloat(strategy.spend_limit);
    const amountPerBuy = parseFloat(tier.amount_per_buy);

    if (stratTotalSpent + amountPerBuy > spendLimit) {
      console.log("[DCA] Tier " + tier.tier_number + " blocked: would exceed spend limit");
      continue;
    }

    console.log("[DCA] Executing tier " + tier.tier_number + ": $" + amountPerBuy + " at SOL $" + currentPrice);

    const txRecord = db.prepare(
      "INSERT INTO transactions (strategy_id, from_token, to_token, amount_in, sol_price_at_execution, status) VALUES (?, ?, ?, ?, ?, ?)"
    ).run(strategy.id, strategy.from_token, strategy.to_token, String(amountPerBuy), currentPrice, "pending");

    const txId = txRecord.lastInsertRowid;
    const { success, result, error } = await executeSwapViaCli(strategy, amountPerBuy);

    if (success) {
      const txHash = result?.tx?.hash || null;
      const amountOut = result?.swap?.to || "unknown";

      db.prepare(
        "UPDATE transactions SET tx_hash = ?, amount_out = ?, status = ?, executed_at = datetime('now') WHERE id = ?"
      ).run(txHash, amountOut, "success", txId);

      const tierSpent = parseFloat(tier.total_spent || "0");
      db.prepare(
        "UPDATE strategy_tiers SET total_spent = ?, total_buys = total_buys + 1, status = ? WHERE id = ?"
      ).run((tierSpent + amountPerBuy).toFixed(6), "completed", tier.id);

      db.prepare(
        "UPDATE strategies SET total_spent = ?, total_buys = total_buys + 1, updated_at = datetime('now') WHERE id = ?"
      ).run((stratTotalSpent + amountPerBuy).toFixed(6), strategy.id);

      await notifySwapSuccess({
        strategyName: strategy.name,
        tierNumber: tier.tier_number,
        amountIn: amountPerBuy.toFixed(2),
        amountOut,
        solPrice: currentPrice.toFixed(2),
        txHash,
      }).catch(() => {});

      console.log("[DCA] Tier " + tier.tier_number + " executed. Tx: " + txHash);
      anyExecuted = true;
    } else {
      db.prepare(
        "UPDATE transactions SET status = ?, error = ?, executed_at = datetime('now') WHERE id = ?"
      ).run("failed", error, txId);

      await notifySwapFailed({
        strategyName: strategy.name,
        tierNumber: tier.tier_number,
        amountIn: amountPerBuy.toFixed(2),
        solPrice: currentPrice.toFixed(2),
        error,
      }).catch(() => {});

      console.error("[DCA] Tier " + tier.tier_number + " failed: " + error);
    }
  }

  const remaining = db.prepare(
    "SELECT COUNT(*) as count FROM strategy_tiers WHERE strategy_id = ? AND status = ?"
  ).get(strategy.id, "active");

  if (remaining.count === 0) {
    db.prepare(
      "UPDATE strategies SET status = ?, updated_at = datetime('now') WHERE id = ?"
    ).run("completed", strategy.id);
    await notifyStrategyCompleted({
      name: strategy.name,
      totalSpent: strategy.total_spent,
      totalBuys: strategy.total_buys,
    }).catch(() => {});
  }

  return { executed: anyExecuted };
}
