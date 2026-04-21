import { useState, useEffect } from "react";
import { strategiesApi } from "../api";

const STATUS_COLORS = {
  active: "text-green-400 bg-green-400/10",
  paused: "text-yellow-400 bg-yellow-400/10",
  completed: "text-gray-400 bg-gray-400/10",
};

const STATUS_DOT = {
  active: "bg-green-400 animate-pulse",
  paused: "bg-yellow-400",
  completed: "bg-gray-400",
};

export default function Dashboard({ solPrice, onSelect }) {
  const [strategies, setStrategies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = async () => {
    try {
      const res = await strategiesApi.list();
      setStrategies(res.data.data);
      setError(null);
    } catch (e) {
      setError("Failed to load strategies. Is the backend running?");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
  }, []);

  const handlePause = async (e, id) => {
    e.stopPropagation();
    await strategiesApi.pause(id);
    load();
  };

  const handleResume = async (e, id) => {
    e.stopPropagation();
    await strategiesApi.resume(id);
    load();
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (!confirm("Delete this strategy? This cannot be undone.")) return;
    await strategiesApi.delete(id);
    load();
  };

  const totalActive = strategies.filter((s) => s.status === "active").length;
  const totalSpent = strategies.reduce((sum, s) => sum + parseFloat(s.total_spent || 0), 0);
  const totalBuys = strategies.reduce((sum, s) => sum + s.total_buys, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Active Strategies", value: totalActive },
          { label: "Total Spent", value: `$${totalSpent.toFixed(2)}` },
          { label: "Total Buys Executed", value: totalBuys },
        ].map((stat) => (
          <div key={stat.label} className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <p className="text-sm text-gray-400">{stat.label}</p>
            <p className="text-2xl font-bold mt-1">{stat.value}</p>
          </div>
        ))}
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-4">DCA Strategies</h2>

        {error && (
          <div className="bg-red-900/30 border border-red-700 rounded-xl p-4 text-red-400 text-sm">
            {error}
          </div>
        )}

        {!error && strategies.length === 0 && (
          <div className="bg-gray-900 border border-gray-800 border-dashed rounded-xl p-12 text-center">
            <p className="text-gray-400 text-sm">No strategies yet.</p>
            <p className="text-gray-600 text-xs mt-1">
              Create your first DCA strategy to start accumulating SOL.
            </p>
          </div>
        )}

        <div className="space-y-3">
          {strategies.map((s) => {
            const spent = parseFloat(s.total_spent || 0);
            const limit = parseFloat(s.spend_limit);
            const pct = Math.min((spent / limit) * 100, 100);
            const priceCondition = solPrice && solPrice <= s.target_price;

            return (
              <div
                key={s.id}
                onClick={() => onSelect(s.id)}
                className="bg-gray-900 border border-gray-800 hover:border-gray-600 rounded-xl p-5 cursor-pointer transition-all group"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <h3 className="font-semibold text-white truncate">{s.name}</h3>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full flex items-center gap-1.5 ${STATUS_COLORS[s.status]}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[s.status]}`} />
                        {s.status}
                      </span>
                      {solPrice && s.status === "active" && (
                        <span className={`text-xs px-2 py-0.5 rounded-full ${priceCondition ? "bg-green-500/20 text-green-400" : "bg-gray-700 text-gray-400"}`}>
                          {priceCondition ? "🎯 Target hit!" : `Target: $${s.target_price}`}
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm text-gray-400 mb-3">
                      <div>
                        <p className="text-xs text-gray-600">Buy amount</p>
                        <p className="text-white font-mono">${s.amount_per_buy} USDC</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600">Price tiers</p>
                        <p className="text-white font-mono">
                          {s.tiers && s.tiers.length > 1
                            ? s.tiers.length + " tiers"
                            : "$" + s.target_price}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600">Buys done</p>
                        <p className="text-white">{s.total_buys}{s.max_buys ? ` / ${s.max_buys}` : ""}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600">Expires</p>
                        <p className="text-white">{new Date(s.expiry_date).toLocaleDateString()}</p>
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span>Spent: ${spent.toFixed(2)}</span>
                        <span>Limit: ${limit.toFixed(2)}</span>
                      </div>
                      <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-cyan-500 rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    {s.status === "active" && (
                      <button
                        onClick={(e) => handlePause(e, s.id)}
                        className="text-xs bg-gray-700 hover:bg-yellow-600 px-3 py-1.5 rounded-lg transition-colors"
                      >
                        Pause
                      </button>
                    )}
                    {s.status === "paused" && (
                      <button
                        onClick={(e) => handleResume(e, s.id)}
                        className="text-xs bg-gray-700 hover:bg-green-600 px-3 py-1.5 rounded-lg transition-colors"
                      >
                        Resume
                      </button>
                    )}
                    <button
                      onClick={(e) => handleDelete(e, s.id)}
                      className="text-xs bg-gray-700 hover:bg-red-700 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
