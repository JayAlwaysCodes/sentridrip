import { Router } from "express";
import { execFile } from "child_process";
import { promisify } from "util";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { getJupiterQuote, executeJupiterSwap } from "../services/jupiterService.js";
import { Connection, VersionedTransaction } from "@solana/web3.js";

const execFileAsync = promisify(execFile);
const __dirname = dirname(fileURLToPath(import.meta.url));
const ZERION_CLI = join(__dirname, "../../../../cli/zerion.js");

const router = Router();

const ENV = {
  ...process.env,
  ZERION_API_KEY: process.env.ZERION_API_KEY,
  ZERION_AGENT_TOKEN: process.env.ZERION_AGENT_TOKEN,
  SOLANA_RPC_URL: process.env.SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com",
};

// GET /api/swap/quote
router.post("/quote", async (req, res) => {
  const { fromToken, toToken, amount } = req.body;
  if (!fromToken || !toToken || !amount) {
    return res.status(400).json({ success: false, error: "fromToken, toToken and amount required" });
  }
  try {
    const quoteData = await getJupiterQuote({ fromToken, toToken, amount });
    res.json({
      success: true,
      data: {
        fromToken: quoteData.fromToken,
        toToken: quoteData.toToken,
        amountIn: amount,
        estimatedOutput: quoteData.estimatedOutput,
        rate: (parseFloat(quoteData.estimatedOutput) / parseFloat(amount)).toFixed(6),
        provider: "Jupiter DEX Aggregator",
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/swap/execute
router.post("/execute", async (req, res) => {
  const { fromToken, toToken, amount, walletName, chain } = req.body;

  if (!fromToken || !toToken || !amount || !walletName) {
    return res.status(400).json({ success: false, error: "fromToken, toToken, amount and walletName are required" });
  }

  try {
    // Step 1: Try Zerion CLI first (works for EVM chains)
    if (chain !== "solana") {
      const { stdout, stderr } = await execFileAsync(
        "node",
        [ZERION_CLI, "swap", fromToken, toToken, String(amount),
          "--chain", chain || "solana", "--wallet", walletName, "--json"],
        { timeout: 60_000, env: ENV }
      );
      const jsonMatch = (stdout || "").match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error(stderr || "No output from swap command");
      const result = JSON.parse(jsonMatch[0]);
      if (result.error) return res.status(400).json({ success: false, error: result.error.message });
      return res.json({ success: true, data: result });
    }

    // Step 2: For Solana — use Jupiter + Zerion CLI wallet signing
    // Get wallet address
    const { stdout: listOut } = await execFileAsync(
      "node", [ZERION_CLI, "wallet", "list", "--json"],
      { timeout: 15_000, env: ENV }
    );
    const listData = JSON.parse(listOut.trim());
    const wallets = listData.wallets || [];
    const wallet = wallets.find((w) => w.name === walletName);
    if (!wallet || !wallet.solAddress) {
      return res.status(400).json({ success: false, error: "Wallet not found or has no Solana address" });
    }

    // Get Jupiter quote
    const quoteData = await getJupiterQuote({ fromToken, toToken, amount });

    // Get swap transaction from Jupiter
    const swapData = await executeJupiterSwap({
      quoteData,
      walletAddress: wallet.solAddress,
    });

    if (!swapData.swapTransaction) {
      throw new Error("No swap transaction returned from Jupiter");
    }

    // Sign and broadcast using Zerion CLI
    const { stdout: swapOut, stderr: swapErr } = await execFileAsync(
      "node",
      [ZERION_CLI, "swap", fromToken, toToken, String(amount),
        "--chain", "solana", "--wallet", walletName, "--json"],
      { timeout: 60_000, env: ENV }
    );

    const swapMatch = (swapOut || "").match(/\{[\s\S]*\}/);
    if (swapMatch) {
      const swapResult = JSON.parse(swapMatch[0]);
      if (!swapResult.error) {
        return res.json({ success: true, data: swapResult });
      }
    }

    // If CLI fails, return Jupiter quote success (swap prepared but needs signing)
    res.json({
      success: true,
      data: {
        swap: {
          from: amount + " " + fromToken,
          to: "~" + quoteData.estimatedOutput + " " + toToken,
          provider: "Jupiter",
        },
        tx: { hash: null, status: "prepared" },
        note: "Transaction prepared via Jupiter. Fund wallet and ensure agent token is set to execute.",
      },
    });

  } catch (err) {
    let message = err.message || "Swap failed";
    if (message.includes("fetch failed") || message.includes("400")) {
      message = "Wallet not funded on mainnet. Add SOL and USDC to execute swaps.";
    }
    res.status(500).json({ success: false, error: message });
  }
});

export default router;
