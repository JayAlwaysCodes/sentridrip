import { useState, useEffect } from "react";
import { walletApi } from "../api";

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={handleCopy}
      className="text-xs bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded transition-colors shrink-0"
    >
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}


function SendModal({ wallet, onClose }) {
  const [form, setForm] = useState({ token: "SOL", toAddress: "", amount: "" });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const friendlyError = (raw) => {
    if (!raw) return "Send failed. Please try again.";
    const msg = raw.toLowerCase();
    if (msg.includes("insufficient") || msg.includes("balance")) return "Insufficient " + form.token + " balance in wallet.";
    if (msg.includes("not funded") || msg.includes("400")) return "Wallet not funded on mainnet yet.";
    if (msg.includes("agent") || msg.includes("api key")) return "Agent token missing or expired.";
    if (msg.includes("network") || msg.includes("fetch")) return "Network error. Check connection and try again.";
    if (msg.includes("invalid") && msg.includes("address")) return "Invalid Solana address. Please double-check.";
    return raw.length > 100 ? raw.slice(0, 100) + "..." : raw;
  };

  const handleSend = async (e) => {
    e.preventDefault();
    setError(null);
    setResult(null);
    setLoading(true);
    try {
      const res = await walletApi.send({
        walletName: wallet.name,
        token: form.token,
        toAddress: form.toAddress,
        amount: form.amount,
        chain: "solana",
      });
      setResult(res.data.data);
    } catch (e) {
      setError(friendlyError(e.response?.data?.error || e.message));
    } finally {
      setLoading(false);
    }
  };

  const solscanUrl = result && result.hash ? "https://solscan.io/tx/" + result.hash : null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-gray-800">
          <div>
            <h2 className="font-bold text-lg">Send / Withdraw</h2>
            <p className="text-xs text-gray-500 mt-0.5">From: {wallet.name}</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-xl">x</button>
        </div>
        <div className="p-6">
          {!result ? (
            <form onSubmit={handleSend} className="space-y-4">
              <div>
                <label className="text-sm text-gray-400 block mb-1">Token</label>
                <div className="flex gap-2">
                  {["SOL", "USDC"].map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => set("token", t)}
                      className={"flex-1 py-2.5 rounded-lg text-sm font-medium border transition-colors " +
                        (form.token === t
                          ? "border-cyan-500 bg-cyan-500/10 text-cyan-400"
                          : "border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-600")}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm text-gray-400 block mb-1">Recipient Solana Address</label>
                <input
                  type="text"
                  placeholder="e.g. Dmo7nNVD5J3Afo8TxXvChQ..."
                  value={form.toAddress}
                  onChange={(e) => set("toAddress", e.target.value)}
                  required
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-sm font-mono focus:outline-none focus:border-cyan-500 transition-colors"
                />
              </div>

              <div>
                <label className="text-sm text-gray-400 block mb-1">Amount ({form.token})</label>
                <input
                  type="number"
                  step="0.000001"
                  min="0.000001"
                  placeholder="0.00"
                  value={form.amount}
                  onChange={(e) => set("amount", e.target.value)}
                  required
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-cyan-500 transition-colors"
                />
              </div>

              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 text-xs text-yellow-400">
                Double-check the recipient address. Blockchain transactions are irreversible.
              </div>

              {error && (
                <div className="bg-red-900/30 border border-red-700 rounded-lg p-3 text-red-400 text-sm">
                  {error}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 bg-gray-800 hover:bg-gray-700 py-2.5 rounded-xl text-sm transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-red-500 hover:bg-red-400 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl transition-colors text-sm"
                >
                  {loading ? "Sending..." : "Send " + form.token}
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-4 text-center">
              <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center mx-auto">
                <span className="text-green-400 text-xl">OK</span>
              </div>
              <div>
                <h3 className="font-bold text-green-400">Transaction Sent!</h3>
                <p className="text-gray-400 text-sm mt-1">
                  {form.amount + " " + form.token + " sent successfully"}
                </p>
              </div>
              {solscanUrl && (
                <button
                  onClick={() => window.open(solscanUrl, "_blank")}
                  className="text-xs text-cyan-400 hover:underline font-mono block mx-auto"
                >
                  {result.hash.slice(0, 16) + "... View on Solscan"}
                </button>
              )}
              <button
                onClick={onClose}
                className="w-full bg-cyan-500 hover:bg-cyan-400 text-gray-950 font-bold py-2.5 rounded-xl transition-colors"
              >
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CreateWalletModal({ onClose, onCreated }) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ name: "", passphrase: "", confirm: "" });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    if (form.passphrase !== form.confirm) { setError("Passphrases do not match"); return; }
    if (form.passphrase.length < 8) { setError("Passphrase must be at least 8 characters"); return; }
    setLoading(true);
    try {
      const res = await walletApi.create(form.name, form.passphrase);
      setResult(res.data.data);
      setStep(3);
      onCreated();
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-gray-800">
          <h2 className="font-bold text-lg">Create New Wallet</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-xl">x</button>
        </div>
        <div className="p-6">
          {step === 1 && (
            <div className="space-y-4">
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 text-sm text-yellow-400">
                Your passphrase is the ONLY way to access your wallet. There is no reset or recovery. Store it safely.
              </div>
              <button onClick={() => setStep(2)} className="w-full bg-cyan-500 hover:bg-cyan-400 text-gray-950 font-bold py-3 rounded-xl transition-colors">
                I understand, continue
              </button>
            </div>
          )}
          {step === 2 && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm text-gray-400 block mb-1">Wallet Name</label>
                <input type="text" placeholder="e.g. my-sol-wallet" value={form.name}
                  onChange={(e) => set("name", e.target.value)} required
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-cyan-500" />
              </div>
              <div>
                <label className="text-sm text-gray-400 block mb-1">Passphrase</label>
                <input type="password" placeholder="Min 8 characters" value={form.passphrase}
                  onChange={(e) => set("passphrase", e.target.value)} required
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-cyan-500" />
              </div>
              <div>
                <label className="text-sm text-gray-400 block mb-1">Confirm Passphrase</label>
                <input type="password" placeholder="Repeat passphrase" value={form.confirm}
                  onChange={(e) => set("confirm", e.target.value)} required
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-cyan-500" />
              </div>
              {error && <p className="text-red-400 text-sm">{error}</p>}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setStep(1)} className="flex-1 bg-gray-800 hover:bg-gray-700 py-2.5 rounded-xl text-sm">Back</button>
                <button type="submit" disabled={loading} className="flex-1 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-gray-950 font-bold py-2.5 rounded-xl text-sm">
                  {loading ? "Creating..." : "Create Wallet"}
                </button>
              </div>
            </form>
          )}
          {step === 3 && result && (
            <div className="space-y-4">
              <div className="text-center">
                <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-green-400 text-xl">OK</span>
                </div>
                <h3 className="font-bold text-green-400">Wallet Created!</h3>
              </div>
              {result.solAddress && (
                <div className="bg-gray-800 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-1">Solana Address</p>
                  <div className="flex items-center gap-2">
                    <p className="font-mono text-xs text-cyan-400 break-all flex-1">{result.solAddress}</p>
                    <CopyButton text={result.solAddress} />
                  </div>
                </div>
              )}
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 text-xs text-yellow-400">
                Fund this address with SOL and USDC to start DCA strategies.
              </div>
              <button onClick={onClose} className="w-full bg-cyan-500 hover:bg-cyan-400 text-gray-950 font-bold py-2.5 rounded-xl">Done</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function PortfolioPanel({ walletName, solAddr }) {
  const [portfolio, setPortfolio] = useState(null);
  const [positions, setPositions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    setPortfolio(null);
    setPositions([]);
    Promise.all([walletApi.portfolio(walletName), walletApi.positions(walletName)])
      .then(([portRes, posRes]) => {
        setPortfolio(portRes.data.data);
        const pd = posRes.data.data;
        setPositions(pd.data || pd || []);
      })
      .catch(() => setPortfolio(null))
      .finally(() => setLoading(false));
  }, [walletName]);

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
      <h2 className="font-semibold mb-4 text-sm text-gray-400 uppercase tracking-wider">Solana Portfolio</h2>
      {loading && (
        <div className="flex items-center gap-2 text-gray-400 text-sm">
          <div className="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
          Loading...
        </div>
      )}
      {!loading && portfolio && (
        <div className="space-y-3">
          {portfolio.portfolio && portfolio.portfolio.total != null && (
            <div className="bg-gray-800 rounded-lg p-3">
              <p className="text-xs text-gray-500">Total Value</p>
              <p className="text-2xl font-bold mt-0.5">{"$" + parseFloat(portfolio.portfolio.total).toFixed(2)}</p>
            </div>
          )}
          {positions.length > 0 && (
            <div className="space-y-2">
              {positions.slice(0, 8).map((p, i) => {
                const attr = p.attributes || p;
                const symbol = attr.fungible_info ? attr.fungible_info.symbol : "Unknown";
                const value = attr.value != null ? "$" + parseFloat(attr.value).toFixed(2) : "N/A";
                const qty = attr.quantity && attr.quantity.float != null ? parseFloat(attr.quantity.float).toFixed(4) : "0";
                const change = attr.changes ? attr.changes.percent_1d : null;
                const changePos = change != null && change >= 0;
                const changeText = change != null ? (changePos ? "+" : "") + change.toFixed(2) + "%" : null;
                return (
                  <div key={i} className="flex justify-between items-center p-3 bg-gray-800/50 rounded-lg text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-500 to-cyan-400 flex items-center justify-center text-xs font-bold">
                        {symbol.slice(0, 1)}
                      </div>
                      <span className="font-medium">{symbol}</span>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{value}</p>
                      <div className="flex items-center gap-2 justify-end">
                        <p className="text-xs text-gray-500">{qty + " " + symbol}</p>
                        {changeText && (
                          <p className={"text-xs font-medium " + (changePos ? "text-green-400" : "text-red-400")}>{changeText}</p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {positions.length === 0 && <p className="text-gray-500 text-sm">No Solana positions yet.</p>}
        </div>
      )}
      {!loading && !portfolio && (
        <div className="text-center py-6 space-y-2">
          <p className="text-gray-400 text-sm font-medium">Wallet not funded on mainnet yet</p>
          <p className="text-gray-600 text-xs">Send SOL and USDC to your Solana address to get started</p>
          {solAddr && (
            <div className="mt-3 space-y-2">
              <div className="bg-gray-800 rounded-lg p-3 text-left">
                <p className="text-xs text-gray-500 mb-1">Solana Deposit Address</p>
                <p className="text-xs text-gray-600 mb-2">Same address accepts both SOL and USDC (SPL)</p>
                <div className="flex items-center gap-2">
                  <p className="font-mono text-xs text-cyan-400 break-all flex-1">{solAddr}</p>
                  <CopyButton text={solAddr} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-2 text-center">
                  <p className="text-xs text-gray-500">Deposit SOL</p>
                  <p className="text-xs text-white mt-0.5">Send SOL on Solana network</p>
                </div>
                <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-2 text-center">
                  <p className="text-xs text-gray-500">Deposit USDC</p>
                  <p className="text-xs text-white mt-0.5">Send USDC (SPL) on Solana network</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function WalletPage({ wallets, activeWallet, onWalletSelect, onWalletsUpdated }) {
  const [showCreate, setShowCreate] = useState(false);
  const [showSend, setShowSend] = useState(false);
  const shortAddr = (addr) => addr ? addr.slice(0, 6) + "..." + addr.slice(-6) : null;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {showSend && activeWallet && (
        <SendModal
          wallet={activeWallet}
          onClose={() => setShowSend(false)}
        />
      )}
      {showCreate && (
        <CreateWalletModal
          onClose={() => setShowCreate(false)}
          onCreated={() => { onWalletsUpdated(); setShowCreate(false); }}
        />
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Wallet Manager</h1>
          <p className="text-gray-400 text-sm mt-1">Manage your wallets and view your Solana portfolio</p>
        </div>
        <div className="flex gap-2">
          {activeWallet && (
            <button
              onClick={() => setShowSend(true)}
              className="bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 font-semibold text-sm px-4 py-2 rounded-lg transition-colors"
            >
              Send / Withdraw
            </button>
          )}
          <button
            onClick={() => setShowCreate(true)}
            className="bg-cyan-500 hover:bg-cyan-400 text-gray-950 font-semibold text-sm px-4 py-2 rounded-lg transition-colors"
          >
            + New Wallet
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h2 className="font-semibold mb-3 text-sm text-gray-400 uppercase tracking-wider">Wallets</h2>
          {wallets.length === 0 && (
            <div className="text-center py-6">
              <p className="text-gray-500 text-sm">No wallets yet.</p>
              <button onClick={() => setShowCreate(true)} className="mt-3 text-sm text-cyan-400 hover:underline">
                Create your first wallet
              </button>
            </div>
          )}
          <div className="space-y-2">
            {wallets.map((w, i) => {
              const isSelected = activeWallet && activeWallet.name === w.name;
              return (
                <div
                  key={i}
                  onClick={() => onWalletSelect(w)}
                  className={"p-3 rounded-lg cursor-pointer border transition-all " +
                    (isSelected ? "border-cyan-500 bg-cyan-500/10" : "border-gray-700 hover:border-gray-600 bg-gray-800/50")}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">{w.name}</span>
                    {isSelected && <span className="text-xs text-cyan-400">Selected</span>}
                  </div>
                  {w.solAddress && (
                    <p className="text-xs text-gray-500 mt-1 font-mono">{shortAddr(w.solAddress)}</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="md:col-span-2 space-y-4">
          {activeWallet ? (
            <>
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                <h2 className="font-semibold mb-4 text-sm text-gray-400 uppercase tracking-wider">Wallet Info</h2>
                <div className="space-y-4">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Wallet Name</p>
                    <p className="font-mono text-sm">{activeWallet.name}</p>
                  </div>
                  {activeWallet.solAddress && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Solana Address</p>
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-mono text-xs text-cyan-400 break-all flex-1">{activeWallet.solAddress}</p>
                        <CopyButton text={activeWallet.solAddress} />
                      </div>
                      <button
                        onClick={() => window.open("https://solscan.io/account/" + activeWallet.solAddress, "_blank")}
                        className="text-xs text-cyan-500 hover:underline mt-1 inline-block"
                      >
                        View on Solscan
                      </button>
                    </div>
                  )}
                  {activeWallet.evmAddress && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1">EVM Address</p>
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-mono text-xs text-gray-400 break-all flex-1">{activeWallet.evmAddress}</p>
                        <CopyButton text={activeWallet.evmAddress} />
                      </div>
                    </div>
                  )}
                  {activeWallet.policies && activeWallet.policies.length > 0 && (
                    <div>
                      <p className="text-xs text-gray-500 mb-2">Attached Policies</p>
                      <div className="flex flex-wrap gap-2">
                        {activeWallet.policies.map((p, i) => (
                          <span key={i} className="text-xs bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded-full px-3 py-1">
                            {p.summary || p.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <PortfolioPanel key={activeWallet.name} walletName={activeWallet.name} solAddr={activeWallet.solAddress} />
            </>
          ) : (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-12 text-center">
              <p className="text-gray-500 text-sm">Select a wallet to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
