import { useState, useEffect } from "react";
import Dashboard from "./pages/Dashboard";
import CreateStrategy from "./pages/CreateStrategy";
import StrategyDetail from "./pages/StrategyDetail";
import WalletPage from "./pages/WalletPage";
import SwapPage from "./pages/SwapPage";
import { priceApi, walletApi } from "./api";

export default function App() {
  const [page, setPage] = useState(() => {
    return localStorage.getItem("sentridrip_page") || "dashboard";
  });
  const [selectedId, setSelectedId] = useState(null);
  const [solPrice, setSolPrice] = useState(null);
  const [wallets, setWallets] = useState([]);
  const [activeWallet, setActiveWallet] = useState(() => {
    const saved = localStorage.getItem("sentridrip_active_wallet");
    return saved ? JSON.parse(saved) : null;
  });

  useEffect(() => {
    if (page !== "detail" && page !== "create") {
      localStorage.setItem("sentridrip_page", page);
    }
  }, [page]);

  useEffect(() => {
    if (activeWallet) {
      localStorage.setItem("sentridrip_active_wallet", JSON.stringify(activeWallet));
    }
  }, [activeWallet]);

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

  const loadWallets = async () => {
    try {
      const res = await walletApi.list();
      const list = res.data.data.wallets || [];
      setWallets(list);

      if (activeWallet) {
        const refreshed = list.find((w) => w.name === activeWallet.name);
        if (refreshed) {
          setActiveWallet(refreshed);
        } else if (list.length > 0) {
          setActiveWallet(list[0]);
        }
      } else if (list.length > 0) {
        setActiveWallet(list[0]);
      }
    } catch (_) {}
  };

  useEffect(() => { loadWallets(); }, []);

  const navigate = (p, id = null) => {
    setPage(p);
    setSelectedId(id);
  };

  const handleWalletSelect = (w) => {
    setActiveWallet(w);
    localStorage.setItem("sentridrip_active_wallet", JSON.stringify(w));
  };

  const navItems = [
    { id: "dashboard", label: "Dashboard" },
    { id: "wallet", label: "Wallets" },
    { id: "swap", label: "Swap" },
  ];

  const shortAddr = (addr) => addr ? addr.slice(0, 4) + "..." + addr.slice(-4) : null;

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
            {activeWallet && (
              <button
                onClick={() => navigate("wallet")}
                className="hidden sm:flex items-center gap-2 bg-gray-800 hover:bg-gray-700 rounded-full px-3 py-1.5 text-sm transition-colors"
              >
                <div className="w-2 h-2 rounded-full bg-purple-400" />
                <span className="text-gray-300 max-w-28 truncate">{activeWallet.name}</span>
                {activeWallet.solAddress && (
                  <span className="text-gray-500 font-mono text-xs">
                    {shortAddr(activeWallet.solAddress)}
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
          <CreateStrategy onBack={() => navigate("dashboard")} solPrice={solPrice} wallets={wallets} />
        )}
        {page === "detail" && selectedId && (
          <StrategyDetail id={selectedId} onBack={() => navigate("dashboard")} />
        )}
        {page === "wallet" && (
          <WalletPage
            wallets={wallets}
            activeWallet={activeWallet}
            onWalletSelect={handleWalletSelect}
            onWalletsUpdated={loadWallets}
          />
        )}
        {page === "swap" && (
          <SwapPage activeWallet={activeWallet} solPrice={solPrice} />
        )}
      </main>
    </div>
  );
}
