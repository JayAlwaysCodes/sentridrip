import { useState } from "react";
import { strategiesApi } from "../api";

export default function CreateStrategy({ onBack, solPrice }) {
  const [form, setForm] = useState({
    name: "",
    wallet_name: "",
    amount_per_buy: "",
    target_price: solPrice ? (solPrice * 0.9).toFixed(2) : "",
    spend_limit: "",
    expiry_date: "",
    max_buys: "",
    from_token: "USDC",
    to_token: "SOL",
    chain: "solana",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await strategiesApi.create({
        ...form,
        max_buys: form.max_buys ? parseInt(form.max_buys) : null,
        target_price: parseFloat(form.target_price),
      });
      onBack();
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  const maxBuysEstimate =
    form.spend_limit && form.amount_per_buy
      ? Math.floor(parseFloat(form.spend_limit) / parseFloat(form.amount_per_buy))
      : null;

  return (
    <div className="max-w-2xl mx-auto">
      <button onClick={onBack} className="text-sm text-gray-400 hover:text-white mb-6 flex items-center gap-1">
        ← Back
      </button>

      <h1 className="text-2xl font-bold mb-2">New DCA Strategy</h1>
      <p className="text-gray-400 text-sm mb-8">
        SentriDrip will automatically buy SOL with USDC whenever the price hits your target.
      </p>

      <form onSubmit={handleSubmit} className="space-y-6">
        <section className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
          <h2 className="font-semibold text-sm text-gray-400 uppercase tracking-wider">Strategy Info</h2>
          <div>
            <label className="text-sm text-gray-300 block mb-1">Strategy Name</label>
            <input
              type="text"
              placeholder="e.g. Weekly SOL Accumulator"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              required
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-cyan-500 transition-colors"
            />
          </div>
          <div>
            <label className="text-sm text-gray-300 block mb-1">Wallet Name</label>
            <input
              type="text"
              placeholder="Name of your Zerion CLI wallet"
              value={form.wallet_name}
              onChange={(e) => set("wallet_name", e.target.value)}
              required
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-cyan-500 transition-colors"
            />
            <p className="text-xs text-gray-600 mt-1">
              Run <code className="text-cyan-500">zerion wallet list</code> to see your wallets
            </p>
          </div>
        </section>

        <section className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
          <h2 className="font-semibold text-sm text-gray-400 uppercase tracking-wider">Trading Parameters</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-gray-300 block mb-1">Amount per Buy (USDC)</label>
              <input
                type="number"
                step="0.01"
                min="1"
                placeholder="10.00"
                value={form.amount_per_buy}
                onChange={(e) => set("amount_per_buy", e.target.value)}
                required
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-cyan-500 transition-colors"
              />
            </div>
            <div>
              <label className="text-sm text-gray-300 block mb-1">Target SOL Price ($)</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                placeholder="120.00"
                value={form.target_price}
                onChange={(e) => set("target_price", e.target.value)}
                required
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-cyan-500 transition-colors"
              />
              {solPrice && form.target_price && (
                <p className="text-xs mt-1">
                  {parseFloat(form.target_price) < solPrice ? (
                    <span className="text-yellow-400">
                      ⚠️ {((1 - parseFloat(form.target_price) / solPrice) * 100).toFixed(1)}% below current ${solPrice.toFixed(2)}
                    </span>
                  ) : (
                    <span className="text-orange-400">
                      ⚠️ Above current price — bot triggers immediately
                    </span>
                  )}
                </p>
              )}
            </div>
          </div>
        </section>

        <section className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
          <div>
            <h2 className="font-semibold text-sm text-gray-400 uppercase tracking-wider">Scoped Policies</h2>
            <p className="text-xs text-gray-600 mt-1">These policies protect your bot from overspending or running indefinitely.</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-gray-300 block mb-1">
                Spend Limit (USDC) <span className="text-red-400">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="1"
                placeholder="100.00"
                value={form.spend_limit}
                onChange={(e) => set("spend_limit", e.target.value)}
                required
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-cyan-500 transition-colors"
              />
              {maxBuysEstimate && (
                <p className="text-xs text-gray-500 mt-1">≈ {maxBuysEstimate} buys maximum</p>
              )}
            </div>
            <div>
              <label className="text-sm text-gray-300 block mb-1">
                Expiry Date <span className="text-red-400">*</span>
              </label>
              <input
                type="datetime-local"
                value={form.expiry_date}
                onChange={(e) => set("expiry_date", e.target.value)}
                required
                min={new Date().toISOString().slice(0, 16)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-cyan-500 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="text-sm text-gray-300 block mb-1">Max Buys (optional)</label>
            <input
              type="number"
              min="1"
              placeholder="Leave empty for unlimited within spend limit"
              value={form.max_buys}
              onChange={(e) => set("max_buys", e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-cyan-500 transition-colors"
            />
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            {[
              "🔒 Chain lock: Solana only",
              "💰 Spend limit enforced",
              "⏰ Expiry window set",
              "🛡️ No raw transfers",
            ].map((p) => (
              <span key={p} className="text-xs bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 rounded-full px-3 py-1">
                {p}
              </span>
            ))}
          </div>
        </section>

        {error && (
          <div className="bg-red-900/30 border border-red-700 rounded-xl p-4 text-red-400 text-sm">
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onBack}
            className="flex-1 bg-gray-800 hover:bg-gray-700 text-white font-medium py-3 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-gray-950 font-bold py-3 rounded-xl transition-colors"
          >
            {loading ? "Creating..." : "Launch Strategy 🚀"}
          </button>
        </div>
      </form>
    </div>
  );
}
