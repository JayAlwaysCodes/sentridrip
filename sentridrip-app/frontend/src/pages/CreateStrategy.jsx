import { useState, useEffect } from "react";
import { strategiesApi, walletApi } from "../api";

export default function CreateStrategy({ onBack, solPrice, wallets: propWallets }) {
  const [wallets, setWallets] = useState(propWallets || []);
  const [selectedWallet, setSelectedWallet] = useState(null);
  const [walletPositions, setWalletPositions] = useState([]);
  const [loadingPositions, setLoadingPositions] = useState(false);
  const [showWalletPicker, setShowWalletPicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [name, setName] = useState("");
  const [expiry, setExpiry] = useState("");
  const [tiers, setTiers] = useState([
    { target_price: solPrice ? (solPrice * 0.95).toFixed(2) : "", amount_per_buy: "" },
  ]);

  useEffect(() => {
    if (propWallets && propWallets.length > 0) {
      setWallets(propWallets);
    }
  }, [propWallets]);

  const loadPositions = async (walletName) => {
    setLoadingPositions(true);
    try {
      const res = await walletApi.positions(walletName);
      const pd = res.data.data;
      setWalletPositions(pd.data || pd || []);
    } catch (_) {
      setWalletPositions([]);
    } finally {
      setLoadingPositions(false);
    }
  };

  const handleSelectWallet = (w) => {
    setSelectedWallet(w);
    setShowWalletPicker(false);
    loadPositions(w.name);
  };

  const addTier = () => {
    if (tiers.length >= 5) return;
    setTiers([...tiers, { target_price: "", amount_per_buy: "" }]);
  };

  const removeTier = (i) => {
    if (tiers.length === 1) return;
    setTiers(tiers.filter((_, idx) => idx !== i));
  };

  const updateTier = (i, key, val) => {
    const updated = [...tiers];
    updated[i] = { ...updated[i], [key]: val };
    setTiers(updated);
  };

  const totalSpend = tiers.reduce((sum, t) => sum + (parseFloat(t.amount_per_buy) || 0), 0);

  const getUsdcBalance = () => {
    const usdc = walletPositions.find((p) => {
      const attr = p.attributes || p;
      const symbol = attr.fungible_info?.symbol || attr.symbol || "";
      return symbol.toUpperCase() === "USDC";
    });
    if (!usdc) return null;
    const attr = usdc.attributes || usdc;
    return attr.quantity?.float ? parseFloat(attr.quantity.float).toFixed(2) : null;
  };

  const usdcBalance = getUsdcBalance();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedWallet) { setError("Please select a wallet"); return; }
    if (tiers.some((t) => !t.target_price || !t.amount_per_buy)) {
      setError("All tiers must have a target price and amount");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await strategiesApi.create({
        name,
        wallet_name: selectedWallet.name,
        spend_limit: String(totalSpend.toFixed(2)),
        expiry_date: expiry,
        tiers: tiers.map((t) => ({
          target_price: parseFloat(t.target_price),
          amount_per_buy: String(t.amount_per_buy),
        })),
      });
      onBack();
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  const tierColors = ["border-cyan-500/50", "border-purple-500/50", "border-yellow-500/50", "border-green-500/50", "border-red-500/50"];
  const tierBg = ["bg-cyan-500/5", "bg-purple-500/5", "bg-yellow-500/5", "bg-green-500/5", "bg-red-500/5"];

  return (
    <div className="max-w-2xl mx-auto">
      <button onClick={onBack} className="text-sm text-gray-400 hover:text-white mb-6 flex items-center gap-1">
        Back
      </button>

      <h1 className="text-2xl font-bold mb-1">New DCA Strategy</h1>
      <p className="text-gray-400 text-sm mb-8">
        Set multiple price targets — SentriDrip buys SOL automatically when each target is hit.
      </p>

      <form onSubmit={handleSubmit} className="space-y-6">

        <section className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
          <h2 className="font-semibold text-sm text-gray-400 uppercase tracking-wider">Strategy Info</h2>
          <div>
            <label className="text-sm text-gray-300 block mb-1">Strategy Name</label>
            <input
              type="text"
              placeholder="e.g. SOL Bear Market Accumulator"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div>
            <label className="text-sm text-gray-300 block mb-1">Wallet</label>
            {selectedWallet ? (
              <div
                onClick={() => setShowWalletPicker(true)}
                className="w-full bg-gray-800 border border-cyan-500 rounded-lg px-4 py-3 cursor-pointer hover:border-cyan-400 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-white">{selectedWallet.name}</p>
                    {selectedWallet.solAddress && (
                      <p className="text-xs text-gray-500 font-mono mt-0.5">
                        {selectedWallet.solAddress.slice(0, 8)}...{selectedWallet.solAddress.slice(-6)}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    {loadingPositions && <p className="text-xs text-gray-500">Loading balance...</p>}
                    {!loadingPositions && usdcBalance && (
                      <div>
                        <p className="text-xs text-gray-500">USDC Balance</p>
                        <p className="text-sm font-bold text-green-400">${usdcBalance}</p>
                      </div>
                    )}
                    {!loadingPositions && !usdcBalance && walletPositions.length >= 0 && (
                      <p className="text-xs text-yellow-500">No USDC on mainnet</p>
                    )}
                    <p className="text-xs text-cyan-400 mt-1">Change wallet</p>
                  </div>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowWalletPicker(true)}
                className="w-full bg-gray-800 border border-gray-700 hover:border-cyan-500 rounded-lg px-4 py-3 text-left transition-colors"
              >
                <p className="text-sm text-gray-400">Click to select a wallet</p>
                <p className="text-xs text-gray-600 mt-0.5">Balance will be shown after selection</p>
              </button>
            )}

            {showWalletPicker && (
              <div className="mt-2 bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
                <div className="p-3 border-b border-gray-700">
                  <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">Select Wallet</p>
                </div>
                {wallets.length === 0 && (
                  <p className="text-sm text-gray-500 p-4">No wallets found. Create one in the Wallets tab first.</p>
                )}
                {wallets.map((w, i) => (
                  <div
                    key={i}
                    onClick={() => handleSelectWallet(w)}
                    className="flex items-center justify-between p-4 hover:bg-gray-700 cursor-pointer transition-colors border-b border-gray-700/50 last:border-0"
                  >
                    <div>
                      <p className="text-sm font-medium">{w.name}</p>
                      {w.solAddress && (
                        <p className="text-xs text-gray-500 font-mono">{w.solAddress.slice(0, 10)}...</p>
                      )}
                    </div>
                    <span className="text-xs text-cyan-400">Select</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-sm text-gray-400 uppercase tracking-wider">Price Tiers</h2>
              <p className="text-xs text-gray-600 mt-1">Each tier buys SOL when SOL price hits that target</p>
            </div>
            {tiers.length < 5 && (
              <button
                type="button"
                onClick={addTier}
                className="text-xs bg-gray-700 hover:bg-gray-600 text-cyan-400 px-3 py-1.5 rounded-lg transition-colors"
              >
                + Add Tier
              </button>
            )}
          </div>

          <div className="space-y-3">
            {tiers.map((tier, i) => (
              <div key={i} className={"border rounded-xl p-4 space-y-3 " + tierColors[i] + " " + tierBg[i]}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-300 uppercase tracking-wider">
                    Tier {i + 1}
                    {i === 0 && tiers.length > 1 && <span className="text-gray-500 ml-1">(highest target)</span>}
                    {i === tiers.length - 1 && tiers.length > 1 && <span className="text-gray-500 ml-1">(lowest target)</span>}
                  </span>
                  {tiers.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeTier(i)}
                      className="text-xs text-red-400 hover:text-red-300"
                    >
                      Remove
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">Target SOL Price ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      placeholder={solPrice ? (solPrice * (0.95 - i * 0.05)).toFixed(2) : "e.g. 80.00"}
                      value={tier.target_price}
                      onChange={(e) => updateTier(i, "target_price", e.target.value)}
                      required
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyan-500"
                    />
                    {solPrice && tier.target_price && (
                      <p className="text-xs mt-1">
                        {parseFloat(tier.target_price) < solPrice
                          ? <span className="text-green-400">{((1 - parseFloat(tier.target_price) / solPrice) * 100).toFixed(1)}% below current</span>
                          : <span className="text-orange-400">Above current — triggers immediately</span>
                        }
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">Buy Amount (USDC)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="1"
                      placeholder="e.g. 10.00"
                      value={tier.amount_per_buy}
                      onChange={(e) => updateTier(i, "amount_per_buy", e.target.value)}
                      required
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyan-500"
                    />
                    {solPrice && tier.amount_per_buy && tier.target_price && (
                      <p className="text-xs text-gray-500 mt-1">
                        {"~" + (parseFloat(tier.amount_per_buy) / parseFloat(tier.target_price)).toFixed(4) + " SOL"}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {tiers.length > 1 && (
            <div className="bg-gray-800 rounded-lg p-3 flex justify-between items-center">
              <span className="text-sm text-gray-400">Total USDC needed</span>
              <span className="font-bold text-white">${totalSpend.toFixed(2)}</span>
            </div>
          )}

          {usdcBalance && totalSpend > parseFloat(usdcBalance) && (
            <div className="bg-red-900/20 border border-red-700/30 rounded-lg p-3 text-xs text-red-400">
              Total spend (${totalSpend.toFixed(2)}) exceeds your USDC balance (${usdcBalance}). Reduce tier amounts.
            </div>
          )}
        </section>

        <section className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
          <h2 className="font-semibold text-sm text-gray-400 uppercase tracking-wider">Policies</h2>
          <div>
            <label className="text-sm text-gray-300 block mb-1">Strategy Expiry</label>
            <input
              type="datetime-local"
              value={expiry}
              onChange={(e) => setExpiry(e.target.value)}
              required
              min={new Date().toISOString().slice(0, 16)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {["🔒 Chain lock: Solana", "💰 Spend limit: $" + totalSpend.toFixed(2), "⏰ Expiry enforced", "🛡️ No raw transfers"].map((p) => (
              <span key={p} className="text-xs bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 rounded-full px-3 py-1">
                {p}
              </span>
            ))}
          </div>
        </section>

        {error && (
          <div className="bg-red-900/30 border border-red-700 rounded-xl p-4 text-sm">
            <p className="text-red-400">{error}</p>
            {error.includes("Insufficient USDC") && (
              <p className="text-yellow-400 mt-2 text-xs">
                Send USDC (SPL) to your Solana address to fund your wallet, then try again.
              </p>
            )}
          </div>
        )}

        <div className="flex gap-3">
          <button type="button" onClick={onBack} className="flex-1 bg-gray-800 hover:bg-gray-700 text-white font-medium py-3 rounded-xl transition-colors">
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || !selectedWallet}
            className="flex-1 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-gray-950 font-bold py-3 rounded-xl transition-colors"
          >
            {loading ? "Creating..." : "Launch Strategy"}
          </button>
        </div>
      </form>
    </div>
  );
}
