import { Router } from "express";
import { execFile } from "child_process";
import { promisify } from "util";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const execFileAsync = promisify(execFile);
const __dirname = dirname(fileURLToPath(import.meta.url));
const ZERION_CLI = join(__dirname, "../../../../cli/zerion.js");

const router = Router();

router.post("/execute", async (req, res) => {
  const { fromToken, toToken, amount, walletName, chain } = req.body;

  if (!fromToken || !toToken || !amount || !walletName) {
    return res.status(400).json({ success: false, error: "fromToken, toToken, amount and walletName are required" });
  }

  try {
    const { stdout, stderr } = await execFileAsync(
      "node",
      [ZERION_CLI, "swap", fromToken, toToken, String(amount), "--chain", chain || "solana", "--wallet", walletName, "--json"],
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
    if (!jsonMatch) throw new Error(stderr || "No output from swap command");
    const result = JSON.parse(jsonMatch[0]);

    if (result.error) {
      return res.status(400).json({ success: false, error: result.error.message || "Swap failed" });
    }

    res.json({ success: true, data: result });
  } catch (err) {
    let message = "Swap execution failed";
    try {
      const rawStdout = err.stdout || "";
      const rawMsg = err.message || "";
      const combined = rawStdout + rawMsg;

      const match = combined.match(/\{[\s\S]*\}/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        message = parsed?.error?.message || parsed?.message || message;
      }

      if (message === "Swap execution failed") {
        if (combined.includes("fetch failed")) message = "Network error reaching Zerion API";
        else if (combined.includes("insufficient") || combined.includes("balance")) message = "Insufficient balance in wallet";
        else if (combined.includes("no_route") || combined.includes("No swap route")) message = "No swap route found for this pair and amount";
        else if (combined.includes("400")) message = "Wallet has no mainnet funds to swap";
        else if (combined.includes("429")) message = "Rate limit hit. Please wait and try again";
        else if (combined.includes("agent") || combined.includes("API key")) message = "Agent token missing or expired";
      }
    } catch (_) {}
    res.status(500).json({ success: false, error: message });
  }
});

export default router;
