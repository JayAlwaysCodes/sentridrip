import { useState } from "react";
import axios from "axios";

const api = axios.create({ baseURL: "/api" });

export default function SwapPage({ activeWallet, solPrice }) {
  const [fromToken, setFromToken] = useState("USDC");
  const [toToken, setToToken] = useState("SOL");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleFlip = () => {
    setFromToken(toToken);
    setToToken(fromToken);
    setAmount("");
    setResult(null);
    setError(null);
  };

  const estimatedOutput = () => {
    if (!amount || !solPrice) return null;
    const amt = parseFloat(amount);
    if (isNaN(amt)) return null;
    if (fromToken === "USDC" && toToken === "SOL") {
      return (amt / solPrice).toFixed(6) + " SOL";
    }
    if (fromToken === "SOL" && toToken === "USDC") {
      return "$" + (amt * solPrice).toFixed(2) + " USDC";
    }
    return null;
  };

  const friendlyError = (raw) => {
    if (!raw) return "Something went wrong. Please try again.";
    const msg = raw.toLowerCase();
    if (msg.includes("network error") || msg.includes("fetch failed")) {
      return "Network error reaching Zerion API. Check your connection and try again.";
    }
    if (msg.includes("no mainnet funds") || msg.includes("400")) {
      return "Your wallet has no mainnet " + fromToken + " to swap. Please fund your Solana address first.";
    }
    if (msg.includes("insufficient balance") || msg.includes("insufficient")) {
      return "Insufficient " + fromToken + " balance. Fund your wallet before swapping.";
    }
    if (msg.includes("no swap route") || msg.includes("no_route")) {
      return "No swap route found. Try a larger amount — minimum is usually $1 worth.";
    }
    if (msg.includes("agent token") || msg.includes("api key")) {
      return "Agent token missing or expired. Re-create it with: zerion agent create-token";
    }
    if (msg.includes("rate limit") || msg.includes("429")) {
      return "Rate limit reached. Please wait 30 seconds and try again.";
    }
    if (msg.includes("timeout")) {
      return "Swap timed out. Check Solscan for your wallet address to see if it went through.";
    }
    if (msg.includes("passphrase") || msg.includes("decrypt")) {
      return "Wallet authentication failed. Check your agent token configuration.";
    }
    return raw.length > 120 ? raw.slice(0, 120) + "..." : raw;
  };

  const handleSwap = async (e) => {
    e.preventDefault();
    if (!activeWallet) {
      setError("No wallet selected. Go to Wallets and select one.");
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await api.post("/swap/execute", {
        fromToken,
        toToken,
        amount,
        walletName: activeWallet.name,
        chain: "solana",
      });
      setResult(res.data.data);
    } catch (e) {
      const raw = e.response?.data?.error || e.message || "";
      setError(friendlyError(raw));
    } finally {
      setLoading(false);
    }
  };

  const estimate = estimatedOutput();

  return (
    <div className="max-w-md mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Swap</h1>
        <p className="text-gray-400 text-sm mt-1">Instantly swap SOL and USDC via Zerion</p>
      </div>

      {!activeWallet && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 text-sm text-yellow-400 mb-4">
          No wallet selected. Go to Wallets tab and select a wallet first.
        </div>
      )}

      {activeWallet && (
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl px-4 py-2 text-sm text-gray-400 mb-4 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-purple-400" />
          <span>Using wallet:</span>
          <span className="text-white font-medium">{activeWallet.name}</span>
          {activeWallet.solAddress && (
            <span className="font-mono text-xs text-gray-500 ml-auto">
              {activeWallet.solAddress.slice(0, 6)}...{activeWallet.solAddress.slice(-4)}
            </span>
          )}
        </div>
      )}

      <form onSubmit={handleSwap} className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-4">
        <div className="bg-gray-800 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs text-gray-500">From</label>
            <span className="text-xs text-gray-500">
              {fromToken === "USDC" ? "USDC" : "SOL"}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-xs font-bold shrink-0">
              {fromToken.slice(0, 1)}
            </div>
            <input
              type="number"
              step="0.000001"
              min="0.01"
              placeholder="0.00"
              value={amount}
              onChange={(e) => { setAmount(e.target.value); setResult(null); setError(null); }}
              required
              className="flex-1 min-w-0 bg-transparent text-2xl font-bold focus:outline-none placeholder-gray-600"
            />
            <span className="text-gray-300 font-semibold shrink-0">{fromToken}</span>
          </div>
        </div>

        <div className="flex justify-center">
          <button
            type="button"
            onClick={handleFlip}
            className="w-10 h-10 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-full flex items-center justify-center transition-colors text-gray-400 hover:text-white"
          >
            ↕
          </button>
        </div>

        <div className="bg-gray-800 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs text-gray-500">To (estimated)</label>
            <span className="text-xs text-gray-500">{toToken}</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-cyan-400 flex items-center justify-center text-xs font-bold shrink-0">
              {toToken.slice(0, 1)}
            </div>
            <p className="flex-1 min-w-0 text-2xl font-bold text-gray-400 truncate">
              {estimate || "—"}
            </p>
            <span className="text-gray-300 font-semibold shrink-0">{toToken}</span>
          </div>
        </div>

        {solPrice && (
          <div className="flex justify-between text-xs text-gray-500 px-1">
            <span>Rate</span>
            <span>1 SOL = ${solPrice.toFixed(2)} USDC</span>
          </div>
        )}

        <div className="flex flex-wrap gap-2 px-1">
          {["🔒 Solana only", "🛡️ Policy enforced", "⚡ Via Zerion API"].map((p) => (
            <span key={p} className="text-xs bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 rounded-full px-2 py-0.5">
              {p}
            </span>
          ))}
        </div>

        {error && (
          <div className="bg-red-900/30 border border-red-700 rounded-xl p-3 text-red-400 text-sm">
            {error}
          </div>
        )}

        {result && (
          <div className="bg-green-900/30 border border-green-700 rounded-xl p-4 space-y-2">
            <p className="text-green-400 font-semibold text-sm">Swap Executed!</p>
            {result.swap && (
              <p className="text-sm text-gray-300">{result.swap.from} → {result.swap.to}</p>
            )}
            {result.tx && result.tx.hash && (
              <button
                onClick={() => window.open("https://solscan.io/tx/" + result.tx.hash, "_blank")}
                className="text-xs text-cyan-400 hover:underline font-mono"
              >
                {result.tx.hash.slice(0, 16)}... View on Solscan
              </button>
            )}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !activeWallet || !amount}
          className="w-full bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed text-gray-950 font-bold py-3.5 rounded-xl transition-colors text-sm"
        >
          {loading ? "Executing swap..." : "Swap " + fromToken + " → " + toToken}
        </button>
      </form>
    </div>
  );
}
