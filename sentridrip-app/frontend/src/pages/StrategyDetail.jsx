import { useState, useEffect } from "react";
import { strategiesApi } from "../api";

const STATUS_COLORS = {
  success: "text-green-400",
  failed: "text-red-400",
  pending: "text-yellow-400",
};

function TxRow({ tx }) {
  const solscanUrl = "https://solscan.io/tx/" + tx.tx_hash;
  const shortHash = tx.tx_hash ? tx.tx_hash.slice(0, 8) + "..." : null;

  return (
    <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg">
      <div className="flex items-center gap-3">
        <span className={"text-sm font-medium " + (STATUS_COLORS[tx.status] || "text-gray-400")}>
          {tx.status === "success" ? "✓" : tx.status === "failed" ? "✗" : "⏳"}
        </span>
        <div>
          <p className="text-sm">${tx.amount_in} USDC to {tx.amount_out || "..."} SOL</p>
          {tx.sol_price_at_execution && (
            <p className="text-xs text-gray-500">SOL at ${tx.sol_price_at_execution.toFixed(2)}</p>
          )}
        </div>
      </div>
      <div className="text-right">
        {tx.tx_hash && (
          <a href={solscanUrl} target="_blank" rel="noreferrer" className="text-xs text-cyan-400 hover:underline font-mono">
            {shortHash}
          </a>
        )}
        {!tx.tx_hash && tx.error && (
          <span className="text-xs text-red-400">{tx.error.slice(0, 40)}</span>
        )}
        <p className="text-xs text-gray-600 mt-0.5">{new Date(tx.executed_at).toLocaleString()}</p>
      </div>
    </div>
  );
}

function PolicyCard({ label, pass, detail }) {
  return (
    <div className={"flex items-center gap-3 p-3 rounded-lg " + (pass ? "bg-green-500/5 border border-green-500/20" : "bg-red-500/5 border border-red-500/20")}>
      <span className={"text-lg " + (pass ? "text-green-400" : "text-red-400")}>
        {pass ? "✓" : "✗"}
      </span>
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-gray-500">{detail}</p>
      </div>
    </div>
  );
}

export default function StrategyDetail({ id, onBack }) {
  const [data, setData] = useState(null);
  const [policyStatus, setPolicyStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const [stratRes, policyRes] = await Promise.all([
        strategiesApi.get(id),
        strategiesApi.policyStatus(id),
      ]);
      setData(stratRes.data.data);
      setPolicyStatus(policyRes.data.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
  }, [id]);

  const handlePause = async () => { await strategiesApi.pause(id); load(); };
  const handleResume = async () => { await strategiesApi.resume(id); load(); };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!data) return <div className="text-red-400">Strategy not found</div>;

  const spent = parseFloat(data.total_spent || 0);
  const limit = parseFloat(data.spend_limit);
  const pct = Math.min((spent / limit) * 100, 100);

  const statusClass =
    data.status === "active" ? "bg-green-400/10 text-green-400" :
    data.status === "paused" ? "bg-yellow-400/10 text-yellow-400" :
    "bg-gray-400/10 text-gray-400";

  const policyBadgeClass = policyStatus && policyStatus.allowed
    ? "bg-green-500/20 text-green-400"
    : "bg-red-500/20 text-red-400";

  const priceDetail = policyStatus && policyStatus.currentPrice
    ? "SOL $" + policyStatus.currentPrice.toFixed(2) + (policyStatus.priceConditionMet ? " <= " : " > ") + "target $" + data.target_price
    : "Fetching price...";

  const spendDetail = policyStatus && policyStatus.spendProgress
    ? "$" + policyStatus.spendProgress.remaining.toFixed(2) + " remaining of $" + limit.toFixed(2)
    : "Loading...";

  const expiryDetail = policyStatus && policyStatus.isExpired
    ? "Expired"
    : "Active until " + new Date(data.expiry_date).toLocaleDateString();

  const buysValue = String(data.total_buys) + (data.max_buys ? " / " + data.max_buys : "");

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="text-sm text-gray-400 hover:text-white flex items-center gap-1">
          Back
        </button>
        <div className="flex gap-2">
          {data.status === "active" && (
            <button onClick={handlePause} className="text-sm bg-gray-800 hover:bg-yellow-700 px-4 py-2 rounded-lg transition-colors">
              Pause
            </button>
          )}
          {data.status === "paused" && (
            <button onClick={handleResume} className="text-sm bg-gray-800 hover:bg-green-700 px-4 py-2 rounded-lg transition-colors">
              Resume
            </button>
          )}
        </div>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold">{data.name}</h1>
            <p className="text-gray-400 text-sm mt-1">Wallet: {data.wallet_name} - Chain: {data.chain}</p>
          </div>
          <span className={"text-sm font-medium px-3 py-1 rounded-full " + statusClass}>
            {data.status}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
          {[
            { label: "Buy Amount", value: "$" + data.amount_per_buy + " USDC" },
            { label: "Target Price", value: "$" + data.target_price },
            { label: "Total Buys", value: buysValue },
            { label: "Expires", value: new Date(data.expiry_date).toLocaleDateString() },
          ].map((s) => (
            <div key={s.label}>
              <p className="text-xs text-gray-500">{s.label}</p>
              <p className="font-semibold font-mono text-sm mt-0.5">{s.value}</p>
            </div>
          ))}
        </div>

        <div>
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>Spent: ${spent.toFixed(2)}</span>
            <span>Limit: ${limit.toFixed(2)}</span>
          </div>
          <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
            <div className="h-full bg-cyan-500 rounded-full transition-all" style={{ width: pct + "%" }} />
          </div>
          <p className="text-xs text-gray-600 mt-1">{pct.toFixed(1)}% of spend limit used</p>
        </div>
      </div>

      {policyStatus && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            Policy Status
            <span className={"text-xs px-2 py-0.5 rounded-full " + policyBadgeClass}>
              {policyStatus.allowed ? "All clear" : "Blocked"}
            </span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <PolicyCard label="Chain Lock" pass={true} detail="Solana only" />
            <PolicyCard label="Price Target" pass={policyStatus.priceConditionMet} detail={priceDetail} />
            <PolicyCard label="Spend Limit" pass={policyStatus.spendProgress && policyStatus.spendProgress.remaining > 0} detail={spendDetail} />
            <PolicyCard label="Expiry Window" pass={!policyStatus.isExpired} detail={expiryDetail} />
          </div>
          {!policyStatus.allowed && policyStatus.reason && (
            <div className="mt-3 p-3 bg-red-900/20 border border-red-700/30 rounded-lg text-sm text-red-400">
              Blocked: {policyStatus.reason}
            </div>
          )}
        </div>
      )}

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <h2 className="font-semibold mb-4">Transaction History</h2>
        {!data.transactions || data.transactions.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-6">
            No transactions yet. The bot will execute when SOL price hits your target.
          </p>
        ) : (
          <div className="space-y-2">
            {data.transactions.map((tx) => (
              <TxRow key={tx.id} tx={tx} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
