import dotenv from "dotenv";
dotenv.config();

import { Router } from "express";
import { execFile } from "child_process";
import { promisify } from "util";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const execFileAsync = promisify(execFile);
const __dirname = dirname(fileURLToPath(import.meta.url));
const ZERION_CLI = join(__dirname, "../../../../cli/zerion.js");

const router = Router();

const ZERION_KEY = process.env.ZERION_API_KEY;
const AGENT_TOKEN = process.env.ZERION_AGENT_TOKEN;
const SOL_RPC = process.env.SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com";

const ENV = {
  ...process.env,
  ZERION_API_KEY: process.env.ZERION_API_KEY,
  ZERION_AGENT_TOKEN: process.env.ZERION_AGENT_TOKEN,
  SOLANA_RPC_URL: process.env.SOLANA_RPC_URL,
};

async function runCli(args) {
  const env = {
    ...process.env,
    ZERION_API_KEY: ZERION_KEY,           // Force it
    ZERION_AGENT_TOKEN: AGENT_TOKEN || "",
    SOLANA_RPC_URL: SOL_RPC,
  };

  try {
    const { stdout, stderr } = await execFileAsync(
      "node",
      [ZERION_CLI, ...args, "--json"],
      { 
        timeout: 30_000,
        env,
        maxBuffer: 20 * 1024 * 1024   // Important for large responses
      }
    );

    const output = stdout.trim();
    if (!output) {
      throw new Error(stderr || "CLI returned empty output");
    }

    const parsed = JSON.parse(output);
    
    if (parsed.error) {
      throw new Error(parsed.error.message || JSON.stringify(parsed.error));
    }

    return parsed;
  } catch (err) {
    console.error("Zerion CLI Error:", {
      command: args.join(" "),
      error: err.message,
      stdout: err.stdout,
      stderr: err.stderr
    });
    throw err;
  }
}

router.get("/list", async (req, res) => {
  try {
    const result = await runCli(["wallet", "list"]);
    res.json({ success: true, data: result });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.post("/create", async (req, res) => {
  const { name, passphrase } = req.body;
  if (!name || !passphrase) {
    return res.status(400).json({ success: false, error: "name and passphrase are required" });
  }
  if (passphrase.length < 8) {
    return res.status(400).json({ success: false, error: "Passphrase must be at least 8 characters" });
  }
  if (!/^[a-zA-Z0-9_-]+$/.test(name)) {
    return res.status(400).json({ success: false, error: "Name: letters, numbers, hyphens and underscores only" });
  }
  try {
    const keystorePath = join(dirname(fileURLToPath(import.meta.url)), "../../../../cli/lib/wallet/keystore.js");
    const keystore = await import(keystorePath);
    const wallet = keystore.createWallet(name, passphrase);
    res.status(201).json({ success: true, data: wallet });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

const portfolioCache = new Map();

import { getSolanaPortfolio } from "../utils/solanaPortfolio.js";

router.get("/portfolio/:wallet", async (req, res) => {
  try {
    const listResult = await runCli(["wallet", "list"]).catch(() => ({ wallets: [] }));
    const wallets = listResult.wallets || [];
    const found = wallets.find((w) => w.name === req.params.wallet);
    const address = found ? (found.solAddress || found.evmAddress) : req.params.wallet;

    console.log(`[Portfolio] ${req.params.wallet} → ${address}`);

    // Try Zerion
    try {
      const result = await runCli(["portfolio", address]);
      return res.json({ 
        success: true, 
        data: result, 
        source: "zerion" 
      });
    } catch (err) {
      if (!err.message.includes("429") && !err.message.includes("fetch failed")) {
        console.error("Unexpected Zerion error:", err.message);
      }
    }

    // Fallback
    const fallback = await getSolanaPortfolio(address);
    return res.json({ 
      success: true, 
      data: fallback.data, 
      source: "solana-rpc",
      note: "Zerion rate limited - using direct RPC"
    });

  } catch (err) {
    console.error("Portfolio route error:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});
router.get("/positions/:wallet", async (req, res) => {
  try {
    const listResult = await runCli(["wallet", "list"]);
    const wallets = listResult.wallets || [];
    const found = wallets.find((w) => w.name === req.params.wallet);
    const address = found ? (found.solAddress || found.evmAddress) : req.params.wallet;

    // Try positions first, fall back to portfolio data
    try {
      const result = await runCli(["positions", address]);
      res.json({ success: true, data: result });
    } catch (_) {
      // Fallback: build positions from portfolio data
      const portfolio = await runCli(["portfolio", address]);
      const positions = (portfolio.positions || []).map((p) => ({
        attributes: {
          fungible_info: { symbol: p.symbol || p.asset || "SOL" },
          value: p.value,
          quantity: { float: p.amount || p.quantity },
          changes: { percent_1d: p.change_24h || 0 },
        }
      }));
      res.json({ success: true, data: { data: positions } });
    }
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.get("/info/:wallet", async (req, res) => {
  try {
    const result = await runCli(["wallet", "list"]);
    const wallets = result.wallets || [];
    const wallet = wallets.find((w) => w.name === req.params.wallet);
    if (!wallet) return res.status(404).json({ success: false, error: "Wallet not found" });
    res.json({ success: true, data: wallet });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.post("/send", async (req, res) => {
  const { walletName, token, toAddress, amount, chain } = req.body;
  if (!walletName || !token || !toAddress || !amount) {
    return res.status(400).json({ success: false, error: "walletName, token, toAddress and amount are required" });
  }
  if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(toAddress)) {
    return res.status(400).json({ success: false, error: "Invalid Solana address format" });
  }
  try {
    const args = ["send", token, toAddress, String(amount), "--chain", chain || "solana", "--wallet", walletName];
    const { stdout, stderr } = await execFileAsync(
      "node", [ZERION_CLI, ...args, "--json"],
      { timeout: 60_000, env: ENV }
    );
    const jsonMatch = (stdout || "").match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error(stderr || "No output from send command");
    const result = JSON.parse(jsonMatch[0]);
    if (result.error) return res.status(400).json({ success: false, error: result.error.message || "Send failed" });
    res.json({ success: true, data: result });
  } catch (err) {
    let message = "Send failed";
    try {
      const match = (err.stdout || "").match(/\{[\s\S]*\}/);
      if (match) { const p = JSON.parse(match[0]); message = p?.error?.message || message; }
    } catch (_) {}
    res.status(500).json({ success: false, error: message });
  }
});

export default router;
