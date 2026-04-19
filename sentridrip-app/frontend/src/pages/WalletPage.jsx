import { useState, useEffect } from "react";
import { walletApi } from "../api";

export default function WalletPage() {
  const [wallets, setWallets] = useState([]);
  const [portfolio, setPortfolio] = useState(null);
  const [positions, setPositions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [portfolioLoading, setPortfolioLoading] = useState(false);
  const [selectedWallet, setSelectedWallet] = useState(null);
  const [error, setError] = useState(null);

  const loadWallets = async () => {
    try {
      const res = await walletApi.list();
      const data = res.data.data;
      const list = data.wallets || [];
      setWallets(Array.isArray(list) ? list : []);
      if (Array.isArray(list) && list.length > 0) {
        const first = list[0].name || list[0];
        setSelectedWallet(first);
      }
      setError(null);
    } catch (e) {
      setError("Could not load wallets. Make sure the backend is running.");
    } finally {
      setLoading(false);
    }
  };

  const loadPortfolio = async (walletName) => {
    setPortfolioLoading(true);
    setPortfolio(null);
    setPositions([]);
    try {
      const [portRes, posRes] = await Promise.all([
        walletApi.portfolio(walletName),
        walletApi.positions(walletName),
      ]);
      setPortfolio(portRes.data.data);
      const posData = posRes.data.data;
      setPositions(posData.data || posData || []);
    } catch (e) {
      setPortfolio(null);
    } finally {
      setPortfolioLoading(false);
    }
  };

  useEffect(() => { loadWallets(); }, []);
  useEffect(() => { if (selectedWallet) loadPortfolio(selectedWallet); }, [selectedWallet]);

  const selectedWalletObj = wallets.find((w) => (w.name || w) === selectedWallet);
  const solAddr = selectedWalletObj ? selectedWalletObj.solAddress : null;
  const evmAddr = selectedWalletObj ? selectedWalletObj.evmAddress : null;

  const shortAddr = (addr) => {
    if (!addr) return null;
    return addr.slice(0, 8) + "..." + addr.slice(-6);
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Wallet Manager</h1>
        <p className="text-gray-400 text-sm mt-1">View your wallets and Solana portfolio</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h2 className="font-semibold mb-3 text-sm text-gray-400 uppercase tracking-wider">Wallets</h2>
          {loading && <p className="text-gray-500 text-sm">Loading...</p>}
          {error && <p className="text-red-400 text-sm">{error}</p>}
          {!loading && wallets.length === 0 && (
            <div className="text-center py-4">
              <p className="text-gray-500 text-sm">No wallets found.</p>
              <p className="text-gray-600 text-xs mt-2">Create one in terminal:</p>
              <code className="text-cyan-500 text-xs block mt-1">node cli/zerion.js wallet create</code>
            </div>
          )}
          <div className="space-y-2">
            {wallets.map((w, i) => {
              const name = w.name || w;
              const isSelected = selectedWallet === name;
              const addr = w.solAddress ? shortAddr(w.solAddress) : null;
              return (
                <div
                  key={i}
                  onClick={() => setSelectedWallet(name)}
                  className={"p-3 rounded-lg cursor-pointer border transition-all " +
                    (isSelected
                      ? "border-cyan-500 bg-cyan-500/10"
                      : "border-gray-700 hover:border-gray-600 bg-gray-800/50")}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">{name}</span>
                    {isSelected && <span className="text-xs text-cyan-400">Active</span>}
                  </div>
                  {addr && (
                    <p className="text-xs text-gray-500 mt-1 font-mono">{addr}</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="md:col-span-2 space-y-4">
          {selectedWallet && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <h2 className="font-semibold mb-3 text-sm text-gray-400 uppercase tracking-wider">Wallet Info</h2>
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Wallet Name</p>
                  <p className="font-mono text-sm text-white">{selectedWallet}</p>
                </div>
                {solAddr && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Solana Address</p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-mono text-xs text-cyan-400 break-all">{solAddr}</p>
                      <button
                        onClick={() => copyToClipboard(solAddr)}
                        className="text-xs text-gray-500 hover:text-white bg-gray-800 px-2 py-1 rounded shrink-0"
                      >
                        Copy
                      </button>
                    </div>
                    <button
                      onClick={() => window.open("https://solscan.io/account/" + solAddr, "_blank")}
                      className="text-xs text-cyan-500 hover:underline mt-1 inline-block"
                    >
                      View on Solscan
                    </button>
                  </div>
                )}
                {evmAddr && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1">EVM Address</p>
                    <p className="font-mono text-xs text-gray-400 break-all">{evmAddr}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {selectedWallet && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <h2 className="font-semibold mb-3 text-sm text-gray-400 uppercase tracking-wider">
                Solana Portfolio
              </h2>

              {portfolioLoading && (
                <div className="flex items-center gap-2 text-gray-400 text-sm">
                  <div className="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                  Loading portfolio...
                </div>
              )}

              {!portfolioLoading && portfolio && (
                <div className="space-y-3">
                  {portfolio.portfolio && portfolio.portfolio.total != null && (
                    <div className="bg-gray-800 rounded-lg p-3">
                      <p className="text-xs text-gray-500">Total Value</p>
                      <p className="text-xl font-bold mt-0.5">
                        {"$" + parseFloat(portfolio.portfolio.total).toFixed(2)}
                      </p>
                    </div>
                  )}

                  {positions.length > 0 && (
                    <div className="space-y-2">
                      {positions.slice(0, 8).map((p, i) => {
                        const attr = p.attributes || p;
                        const symbol = attr.fungible_info ? attr.fungible_info.symbol : "Unknown";
                        const value = attr.value != null
                          ? "$" + parseFloat(attr.value).toFixed(2)
                          : "N/A";
                        const qty = attr.quantity && attr.quantity.float != null
                          ? parseFloat(attr.quantity.float).toFixed(4)
                          : "0";
                        const change = attr.changes ? attr.changes.percent_1d : null;
                        const changePositive = change != null && change >= 0;
                        const changeText = change != null
                          ? (changePositive ? "+" : "") + change.toFixed(2) + "%"
                          : null;
                        return (
                          <div key={i} className="flex justify-between items-center p-2 bg-gray-800/50 rounded-lg text-sm">
                            <span className="font-mono font-medium">{symbol}</span>
                            <div className="text-right">
                              <p className="text-white">{value}</p>
                              <div className="flex items-center gap-2 justify-end">
                                <p className="text-xs text-gray-500">{qty + " " + symbol}</p>
                                {changeText && (
                                  <p className={"text-xs " + (changePositive ? "text-green-400" : "text-red-400")}>
                                    {changeText}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {positions.length === 0 && (
                    <p className="text-gray-500 text-sm">
                      No Solana positions yet. Fund your wallet to get started.
                    </p>
                  )}
                </div>
              )}

              {!portfolioLoading && !portfolio && (
                <div className="text-center py-4">
                  <p className="text-gray-500 text-sm">No portfolio data available.</p>
                  <p className="text-gray-600 text-xs mt-1">Wallet may not be funded on mainnet yet.</p>
                  {solAddr && (
                    <p className="text-xs text-cyan-500 mt-2 font-mono break-all">
                      {"Deposit SOL to: " + solAddr}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
