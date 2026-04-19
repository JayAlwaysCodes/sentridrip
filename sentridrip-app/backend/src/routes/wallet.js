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
      timeout: 20_000,
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

export default router;
