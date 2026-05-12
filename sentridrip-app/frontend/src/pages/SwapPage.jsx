import { useState, useEffect } from "react";
import { walletApi } from "../api";

export default function SwapPage({ activeWallet, solPrice, onSwapSuccess }) {
  const [fromToken, setFromToken] = useState("SOL");
  const [toToken, setToToken] = useState("USDC");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [balances, setBalances] = useState({ SOL: 0, USDC: 0 });

  useEffect(() => {
    const loadBalances = async () => {
      if (!activeWallet?.name) return;
      try {
        const res = await walletApi.portfolio(activeWallet.name);
        if (res.data.success) {
          const data = res.data.data;
          const positions = data?.positions || data?.data?.positions || data || [];

          let sol = 0, usdc = 0;
          positions.forEach(p => {
            const symbol = (p.symbol || p.fungible_info?.symbol || "").toUpperCase();
            const qty = p.quantity?.float || p.amount || 0;
            if (symbol === "SOL") sol = Number(qty).toFixed(6);
            if (symbol === "USDC") usdc = Number(qty).toFixed(2);
          });
          setBalances({ SOL: sol, USDC: usdc });
        }
      } catch (e) {
        console.error("Balance load failed", e);
      }
    };
    loadBalances();
  }, [activeWallet]);

  const currentBalance = Number(balances[fromToken]) || 0;
  const enteredAmount = parseFloat(amount) || 0;
  const isInsufficient = enteredAmount > currentBalance;

  const handleFlip = () => {
    setFromToken(toToken);
    setToToken(fromToken);
    setAmount("");
    setResult(null);
    setError(null);
  };

  const estimatedOutput = () => {
    if (!amount || !solPrice) return "—";
    const amt = parseFloat(amount);
    if (isNaN(amt)) return "—";
    return fromToken === "USDC"
      ? (amt / solPrice).toFixed(6) + " SOL"
      : "$" + (amt * solPrice).toFixed(2) + " USDC";
  };

  const handleSwap = async (e) => {
    e.preventDefault();
    if (!activeWallet) return setError("No wallet selected");
    if (enteredAmount <= 0) return setError("Enter amount");

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await walletApi.swap.execute({
        fromToken,
        toToken,
        amount: enteredAmount,
        walletName: activeWallet.name,
        chain: "solana",
      });

      setResult(res.data);
      setAmount("");
      if (onSwapSuccess) onSwapSuccess();
    } catch (e) {
      let msg = e.response?.data?.error || e.message || "Swap failed";
      if (msg.includes("unfunded") || msg.includes("400")) {
        msg = "Wallet has balance but Zerion CLI can't detect it yet. Try again in 10 seconds or fund with more SOL.";
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const fromColor = fromToken === "SOL" ? "bg-blue-600" : "bg-green-600";
  const toColor = toToken === "USDC" ? "bg-purple-600" : "bg-blue-600";
  const fromLetter = fromToken === "SOL" ? "S" : "U";
  const toLetter = toToken === "USDC" ? "U" : "S";

  return (
    <div className="max-w-md mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Swap</h1>
        <p className="text-gray-400 text-sm mt-1">Instantly swap SOL and USDC via Zerion</p>
      </div>

      {/* Active wallet badge */}
      {activeWallet && (
        <div className="mb-6 bg-gray-800/50 border border-gray-700 rounded-2xl px-5 py-3 flex items-center gap-3">
          <div className="w-2 h-2 bg-purple-500 rounded-full shrink-0" />
          <span className="text-gray-400">Using wallet:</span>
          <span className="font-medium">{activeWallet.name}</span>
        </div>
      )}

      <form onSubmit={handleSwap} className="bg-gray-900 border border-gray-700 rounded-3xl p-6 space-y-4">

        {/* FROM */}
        <div>
          <div className="flex justify-between mb-2 px-1">
            <span className="text-gray-400 text-sm">From</span>
            <span className="text-gray-400 text-sm">
              Balance:{" "}
              <span className={`font-medium ${isInsufficient ? "text-red-400" : "text-white"}`}>
                {currentBalance}
              </span>{" "}
              {fromToken}
            </span>
          </div>
          <div className="bg-gray-800 rounded-2xl p-4 flex items-center gap-3 border border-gray-700 w-full overflow-hidden">
            <div className={`w-11 h-11 rounded-full ${fromColor} flex items-center justify-center text-lg font-bold shrink-0`}>
              {fromLetter}
            </div>
            <input
              type="number"
              step="0.000001"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="flex-1 min-w-0 bg-transparent text-3xl font-bold focus:outline-none placeholder-gray-600"
            />
            <span className="text-xl font-semibold text-gray-200 shrink-0">{fromToken}</span>
          </div>
          {isInsufficient && enteredAmount > 0 && (
            <p className="text-red-400 text-xs mt-1 px-1">Insufficient balance</p>
          )}
        </div>

        {/* FLIP BUTTON */}
        <div className="flex justify-center">
          <button
            type="button"
            onClick={handleFlip}
            className="w-11 h-11 bg-gray-800 border-2 border-gray-700 rounded-full flex items-center justify-center text-xl hover:bg-gray-700 hover:border-gray-500 transition-colors"
            title="Flip tokens"
          >
            ↕
          </button>
        </div>

        {/* TO */}
        <div>
          <div className="flex justify-between mb-2 px-1">
            <span className="text-gray-400 text-sm">To (estimated)</span>
            <span className="text-gray-400 text-sm">{toToken}</span>
          </div>
          <div className="bg-gray-800 rounded-2xl p-4 flex items-center gap-3 border border-gray-700 w-full overflow-hidden">
            <div className={`w-11 h-11 rounded-full ${toColor} flex items-center justify-center text-lg font-bold shrink-0`}>
              {toLetter}
            </div>
            <div className="flex-1 min-w-0 text-3xl font-bold text-gray-400 truncate">
              {estimatedOutput()}
            </div>
            <span className="text-xl font-semibold text-gray-200 shrink-0">{toToken}</span>
          </div>
        </div>

        {/* Rate */}
        {solPrice && (
          <div className="text-center text-xs text-gray-500 py-1">
            1 SOL ≈ ${solPrice.toFixed(2)} USDC
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-900/70 border border-red-700 text-red-300 p-4 rounded-2xl text-sm">
            {error}
          </div>
        )}

        {/* Success */}
        {result && (
          <div className="bg-green-900/50 border border-green-700 text-green-300 p-4 rounded-2xl text-sm">
            ✓ Swap successful!
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={loading || enteredAmount <= 0 || isInsufficient}
          className="w-full bg-cyan-500 hover:bg-cyan-400 disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed font-bold py-4 rounded-2xl text-lg transition-colors"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              Swapping...
            </span>
          ) : (
            `Swap ${fromToken} → ${toToken}`
          )}
        </button>
      </form>
    </div>
  );
}