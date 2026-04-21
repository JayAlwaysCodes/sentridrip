import { useState, useEffect } from "react";
import { pnlApi } from "../api";

export default function PnLPanel({ strategyId }) {
  const [pnl, setPnl] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await pnlApi.strategy(strategyId);
        setPnl(res.data.data);
      } catch (_) {}
      finally { setLoading(false); }
    };
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, [strategyId]);

  if (loading) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <h2 className="font-semibold mb-3 text-sm text-gray-400 uppercase tracking-wider">PnL Tracker</h2>
        <div className="flex items-center gap-2 text-gray-500 text-sm">
          <div className="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
          Calculating...
        </div>
      </div>
    );
  }

  if (!pnl || pnl.txCount === 0) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <h2 className="font-semibold mb-3 text-sm text-gray-400 uppercase tracking-wider">PnL Tracker</h2>
        <p className="text-gray-500 text-sm text-center py-4">
          No completed swaps yet. PnL will appear after the first execution.
        </p>
      </div>
    );
  }

  const isProfit = pnl.isProfit;
  const pnlColor = isProfit ? "text-green-400" : "text-red-400";
  const pnlBg = isProfit ? "bg-green-500/10 border-green-500/20" : "bg-red-500/10 border-red-500/20";
  const pnlSign = isProfit ? "+" : "";

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
      <h2 className="font-semibold text-sm text-gray-400 uppercase tracking-wider">PnL Tracker</h2>

      <div className={"border rounded-xl p-4 text-center " + pnlBg}>
        <p className="text-xs text-gray-500 mb-1">Unrealized PnL</p>
        <p className={"text-3xl font-bold " + pnlColor}>
          {pnlSign + "$" + pnl.totalPnl}
        </p>
        <p className={"text-sm font-medium mt-1 " + pnlColor}>
          {pnlSign + pnl.totalPnlPct + "%"}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {[
          { label: "Total Spent", value: "$" + pnl.totalUsdcSpent, sub: "USDC" },
          { label: "SOL Received", value: pnl.totalSolReceived + " SOL", sub: "Total acquired" },
          { label: "Avg Buy Price", value: "$" + pnl.avgBuyPrice, sub: "Per SOL" },
          { label: "Current Value", value: "$" + pnl.totalCurrentValue, sub: "At $" + parseFloat(pnl.currentSolPrice).toFixed(2) },
        ].map((s) => (
          <div key={s.label} className="bg-gray-800 rounded-lg p-3">
            <p className="text-xs text-gray-500">{s.label}</p>
            <p className="font-bold text-sm mt-0.5">{s.value}</p>
            <p className="text-xs text-gray-600 mt-0.5">{s.sub}</p>
          </div>
        ))}
      </div>

      <div className="bg-gray-800 rounded-lg p-3 flex justify-between items-center">
        <div>
          <p className="text-xs text-gray-500">Break-even Price</p>
          <p className="font-bold text-sm mt-0.5">${pnl.breakEvenPrice}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-500">Successful Buys</p>
          <p className="font-bold text-sm mt-0.5">{pnl.txCount}</p>
        </div>
      </div>

      {pnl.transactions && pnl.transactions.length > 0 && (
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Per Transaction</p>
          <div className="space-y-2">
            {pnl.transactions.map((tx, i) => {
              const txProfit = parseFloat(tx.pnl) >= 0;
              return (
                <div key={i} className="flex justify-between items-center p-2 bg-gray-800/50 rounded-lg text-xs">
                  <div>
                    <p className="text-gray-300">${tx.usdcSpent} USDC → {tx.solReceived} SOL</p>
                    <p className="text-gray-600">Bought @ ${parseFloat(tx.priceAtExecution).toFixed(2)}</p>
                  </div>
                  <div className="text-right">
                    <p className={txProfit ? "text-green-400 font-medium" : "text-red-400 font-medium"}>
                      {txProfit ? "+" : ""}{tx.pnl} ({txProfit ? "+" : ""}{tx.pnlPct}%)
                    </p>
                    <p className="text-gray-600">Now: ${tx.currentValue}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
