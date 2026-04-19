import { useState, useEffect } from "react";
import Dashboard from "./pages/Dashboard";
import CreateStrategy from "./pages/CreateStrategy";
import StrategyDetail from "./pages/StrategyDetail";
import WalletPage from "./pages/WalletPage";
import { priceApi, walletApi } from "./api";

export default function App() {
  const [page, setPage] = useState("dashboard");
  const [selectedId, setSelectedId] = useState(null);
  const [solPrice, setSolPrice] = useState(null);
  const [defaultWallet, setDefaultWallet] = useState(null);

  useEffect(() => {
    const fetchPrice = async () => {
      try {
        const res = await priceApi.getSol();
        setSolPrice(res.data.data.price);
      } catch (_) {}
    };
    fetchPrice();
    const interval = setInterval(fetchPrice, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const fetchWallet = async () => {
      try {
        const res = await walletApi.list();
        const data = res.data.data;
        const wallets = data.wallets || [];
        if (wallets.length > 0) {
          const w = wallets[0];
          setDefaultWallet({ name: w.name, solAddress: w.solAddress || null });
        }
      } catch (_) {}
    };
    fetchWallet();
  }, []);

  const navigate = (p, id = null) => { setPage(p); setSelectedId(id); };

  const navItems = [
    { id: "dashboard", label: "Dashboard" },
    { id: "wallet", label: "Wallets" },
  ];

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="border-b border-gray-800 bg-gray-900 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <button
              onClick={() => navigate("dashboard")}
              className="flex items-center gap-2 hover:opacity-80 transition-opacity"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-cyan-400 flex items-center justify-center text-sm font-bold">
                S
              </div>
              <span className="text-lg font-bold tracking-tight">
                Sentri<span className="text-cyan-400">Drip</span>
              </span>
            </button>
            <nav className="hidden sm:flex items-center gap-1">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => navigate(item.id)}
                  className={"text-sm px-3 py-1.5 rounded-lg transition-colors " +
                    (page === item.id
                      ? "bg-gray-700 text-white"
                      : "text-gray-400 hover:text-white hover:bg-gray-800")}
                >
                  {item.label}
                </button>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-3">
            {defaultWallet && (
              <button
                onClick={() => navigate("wallet")}
                className="hidden sm:flex items-center gap-2 bg-gray-800 hover:bg-gray-700 rounded-full px-3 py-1.5 text-sm transition-colors"
              >
                <div className="w-2 h-2 rounded-full bg-purple-400" />
                <span className="text-gray-300 max-w-24 truncate">{defaultWallet.name}</span>
                {defaultWallet.solAddress && (
                  <span className="text-gray-500 font-mono text-xs">
                    {defaultWallet.solAddress.slice(0, 4)}...{defaultWallet.solAddress.slice(-4)}
                  </span>
                )}
              </button>
            )}
            {solPrice && (
              <div className="flex items-center gap-2 bg-gray-800 rounded-full px-3 py-1.5 text-sm">
                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                <span className="text-gray-400">SOL</span>
                <span className="font-mono font-semibold">${solPrice.toFixed(2)}</span>
              </div>
            )}
            <button
              onClick={() => navigate("create")}
              className="bg-cyan-500 hover:bg-cyan-400 text-gray-950 font-semibold text-sm px-4 py-2 rounded-lg transition-colors"
            >
              + New Strategy
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {page === "dashboard" && (
          <Dashboard solPrice={solPrice} onSelect={(id) => navigate("detail", id)} />
        )}
        {page === "create" && (
          <CreateStrategy onBack={() => navigate("dashboard")} solPrice={solPrice} />
        )}
        {page === "detail" && selectedId && (
          <StrategyDetail id={selectedId} onBack={() => navigate("dashboard")} />
        )}
        {page === "wallet" && <WalletPage />}
      </main>
    </div>
  );
}
