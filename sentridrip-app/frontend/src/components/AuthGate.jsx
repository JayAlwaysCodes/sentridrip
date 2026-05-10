import { useState } from "react";

const DEMO_PASSWORD = import.meta.env.VITE_DEMO_PASSWORD || "sentridrip2024";

export default function AuthGate({ children }) {
  const [authed, setAuthed] = useState(() => {
    return sessionStorage.getItem("sentridrip_auth") === "true";
  });
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (password === DEMO_PASSWORD) {
      sessionStorage.setItem("sentridrip_auth", "true");
      setAuthed(true);
    } else {
      setError(true);
      setTimeout(() => setError(false), 2000);
    }
  };

  if (authed) return children;

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-cyan-400 flex items-center justify-center text-2xl font-bold mx-auto mb-4">
            S
          </div>
          <h1 className="text-2xl font-bold">
            Sentri<span className="text-cyan-400">Drip</span>
          </h1>
          <p className="text-gray-400 text-sm mt-1">Autonomous SOL DCA Agent</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-4">
          <div>
            <label className="text-sm text-gray-400 block mb-1">Demo Password</label>
            <input
              type="password"
              placeholder="Enter password to access demo"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
              className={"w-full bg-gray-800 border rounded-lg px-4 py-2.5 text-sm focus:outline-none transition-colors " +
                (error ? "border-red-500" : "border-gray-700 focus:border-cyan-500")}
            />
            {error && <p className="text-red-400 text-xs mt-1">Incorrect password. Try again.</p>}
          </div>
          <button
            type="submit"
            className="w-full bg-cyan-500 hover:bg-cyan-400 text-gray-950 font-bold py-2.5 rounded-xl transition-colors"
          >
            Access Demo
          </button>
          <p className="text-center text-xs text-gray-600">
            SentriDrip Hackathon Demo — Zerion CLI Frontier Track
          </p>
        </form>
      </div>
    </div>
  );
}
