import { Router } from "express";
import { execFile } from "child_process";
import { promisify } from "util";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const execFileAsync = promisify(execFile);
const __dirname = dirname(fileURLToPath(import.meta.url));
const ZERION_CLI = join(__dirname, "../../../../../cli/zerion.js");

const router = Router();

async function runCli(...args) {
  const { stdout } = await execFileAsync("node", [ZERION_CLI, ...args, "--json"], {
    timeout: 15_000,
    env: { ...process.env },
  });
  return JSON.parse(stdout.trim());
}

router.get("/list", async (req, res) => {
  try {
    const result = await runCli("wallet", "list");
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get("/portfolio/:wallet", async (req, res) => {
  try {
    const result = await runCli("portfolio", "--wallet", req.params.wallet);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get("/positions/:wallet", async (req, res) => {
  try {
    const result = await runCli("positions", "--wallet", req.params.wallet, "--chain", "solana");
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
