import { Router } from "express";
import { execFile } from "child_process";
import { promisify } from "util";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const execFileAsync = promisify(execFile);
const __dirname = dirname(fileURLToPath(import.meta.url));
const ZERION_CLI = join(__dirname, "../../../../cli/zerion.js");

const router = Router();

async function runCli(args) {
  const { stdout, stderr } = await execFileAsync(
    "node", [ZERION_CLI, ...args, "--json"],
    {
      timeout: 60_000,
      env: {
        ...process.env,
        ZERION_API_KEY: process.env.ZERION_API_KEY,
        ZERION_AGENT_TOKEN: process.env.ZERION_AGENT_TOKEN,
        SOLANA_RPC_URL: process.env.SOLANA_RPC_URL,
      },
    }
  );
  try { return JSON.parse(stdout.trim()); }
  catch { throw new Error(stderr || stdout || "CLI returned invalid JSON"); }
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

router.get("/portfolio/:wallet", async (req, res) => {
  try {
    const result = await runCli(["portfolio", "--wallet", req.params.wallet]);
    res.json({ success: true, data: result });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.get("/positions/:wallet", async (req, res) => {
  try {
    const result = await runCli(["positions", "--wallet", req.params.wallet, "--chain", "solana"]);
    res.json({ success: true, data: result });
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

// POST /api/wallet/send
router.post("/send", async (req, res) => {
  const { walletName, token, toAddress, amount, chain } = req.body;

  if (!walletName || !token || !toAddress || !amount) {
    return res.status(400).json({
      success: false,
      error: "walletName, token, toAddress and amount are required",
    });
  }

  // Basic Solana address validation
  if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(toAddress)) {
    return res.status(400).json({
      success: false,
      error: "Invalid Solana address format",
    });
  }

  if (parseFloat(amount) <= 0) {
    return res.status(400).json({ success: false, error: "Amount must be greater than 0" });
  }

  try {
    const args = [
      "send",
      token,
      toAddress,
      String(amount),
      "--chain", chain || "solana",
      "--wallet", walletName,
    ];

    const { stdout, stderr } = await execFileAsync(
      "node", [ZERION_CLI, ...args, "--json"],
      {
        timeout: 60_000,
        env: {
          ...process.env,
          ZERION_API_KEY: process.env.ZERION_API_KEY,
          ZERION_AGENT_TOKEN: process.env.ZERION_AGENT_TOKEN,
          SOLANA_RPC_URL: process.env.SOLANA_RPC_URL,
        },
      }
    );

    const jsonMatch = (stdout || "").match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error(stderr || "No output from send command");
    const result = JSON.parse(jsonMatch[0]);

    if (result.error) {
      return res.status(400).json({ success: false, error: result.error.message || "Send failed" });
    }

    res.json({ success: true, data: result });
  } catch (err) {
    let message = "Send failed";
    try {
      const match = (err.stdout || "").match(/\{[\s\S]*\}/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        message = parsed?.error?.message || message;
      }
      if (message === "Send failed") {
        const combined = (err.stdout || "") + (err.message || "");
        if (combined.includes("insufficient") || combined.includes("balance")) message = "Insufficient balance";
        else if (combined.includes("400")) message = "Wallet not funded on mainnet";
        else if (combined.includes("agent") || combined.includes("API key")) message = "Agent token missing or expired";
        else if (combined.includes("network") || combined.includes("fetch")) message = "Network error. Try again.";
      }
    } catch (_) {}
    res.status(500).json({ success: false, error: message });
  }
});

export default router;
