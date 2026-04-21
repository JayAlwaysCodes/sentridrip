import { useState, useEffect } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, CartesianGrid } from "recharts";
import { priceApi } from "../api";

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-xs">
      <p className="text-gray-400">{label}</p>
      <p className="text-cyan-400 font-bold">${parseFloat(payload[0].value).toFixed(2)}</p>
    </div>
  );
}

export default function PriceChart({ targetPrices = [], height = 200 }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPrice, setCurrentPrice] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [histRes, priceRes] = await Promise.all([
          priceApi.getHistory(60),
          priceApi.getSol(),
        ]);
        const history = histRes.data.data || [];
        setCurrentPrice(priceRes.data.data.price);
        const formatted = history.reverse().map((h, i) => ({
          time: new Date(h.recorded_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          price: parseFloat(h.price),
          index: i,
        }));
        setData(formatted);
      } catch (_) {}
      finally { setLoading(false); }
    };
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-40 text-gray-500 text-sm">
        <div className="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mr-2" />
        Loading price data...
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-gray-500 text-sm">
        No price history yet. Check back in a few minutes.
      </div>
    );
  }

  const prices = data.map((d) => d.price);
  const minPrice = Math.min(...prices, ...(targetPrices.length ? targetPrices : [Infinity]));
  const maxPrice = Math.max(...prices);
  const padding = (maxPrice - minPrice) * 0.1;
  const domainMin = Math.floor((minPrice - padding) * 0.99);
  const domainMax = Math.ceil((maxPrice + padding) * 1.01);

  const tierColors = ["#f59e0b", "#8b5cf6", "#10b981", "#ef4444", "#06b6d4"];

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-xs text-gray-400">SOL/USDC — Last 60 readings</span>
        </div>
        {currentPrice && (
          <span className="text-sm font-bold font-mono text-white">${currentPrice.toFixed(2)}</span>
        )}
      </div>

      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
          <XAxis
            dataKey="time"
            tick={{ fontSize: 10, fill: "#6b7280" }}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            domain={[domainMin, domainMax]}
            tick={{ fontSize: 10, fill: "#6b7280" }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => "$" + v.toFixed(0)}
            width={55}
          />
          <Tooltip content={<CustomTooltip />} />
          <Line
            type="monotone"
            dataKey="price"
            stroke="#06b6d4"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: "#06b6d4" }}
          />
          {targetPrices.map((price, i) => (
            <ReferenceLine
              key={i}
              y={price}
              stroke={tierColors[i % tierColors.length]}
              strokeDasharray="4 4"
              strokeWidth={1.5}
              label={{
                value: "T" + (i + 1) + " $" + price,
                position: "insideTopRight",
                fontSize: 10,
                fill: tierColors[i % tierColors.length],
              }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>

      {targetPrices.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {targetPrices.map((price, i) => (
            <span key={i} className="text-xs px-2 py-0.5 rounded-full border"
              style={{ color: tierColors[i % tierColors.length], borderColor: tierColors[i % tierColors.length] + "50" }}>
              {"Tier " + (i + 1) + ": $" + price}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
