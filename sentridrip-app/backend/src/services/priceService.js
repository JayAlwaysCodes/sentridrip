import https from "https";
import { getDb } from "../db/database.js";

let _cachedPrice = null;
let _lastFetched = 0;
const CACHE_TTL_MS = 30_000;

function httpsGet(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      headers: { "Accept": "application/json", "User-Agent": "SentriDrip/1.0" },
      timeout: 8000,
    }, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error("Invalid JSON: " + data.slice(0, 100))); }
      });
    });
    req.on("error", reject);
    req.on("timeout", () => { req.destroy(); reject(new Error("Request timed out")); });
  });
}

export async function getSolPrice() {
  const now = Date.now();
  if (_cachedPrice && now - _lastFetched < CACHE_TTL_MS) {
    return _cachedPrice;
  }

  const sources = [
    {
      url: "https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd",
      extract: (d) => d?.solana?.usd,
    },
    {
      url: "https://api.binance.com/api/v3/ticker/price?symbol=SOLUSDT",
      extract: (d) => d?.price ? parseFloat(d.price) : null,
    },
    {
      url: "https://price.jup.ag/v6/price?ids=SOL",
      extract: (d) => d?.data?.SOL?.price,
    },
  ];

  for (const source of sources) {
    try {
      const data = await httpsGet(source.url);
      const price = source.extract(data);
      if (price && !isNaN(price)) {
        _cachedPrice = parseFloat(price);
        _lastFetched = now;
        console.log("[Price] SOL: $" + _cachedPrice + " (from " + source.url.split("/")[2] + ")");

        try {
          const db = getDb();
          db.prepare("INSERT INTO price_history (token, price) VALUES (?, ?)").run("SOL", _cachedPrice);
        } catch (_) {}

        return _cachedPrice;
      }
    } catch (err) {
      console.error("[Price] " + source.url.split("/")[2] + " failed: " + err.message);
    }
  }

  if (_cachedPrice) {
    console.warn("[Price] All sources failed, using cached: $" + _cachedPrice);
    return _cachedPrice;
  }

  throw new Error("Could not fetch SOL price from any source");
}

export function getLastKnownPrice() {
  return _cachedPrice;
}

export async function getPriceHistory(limit = 60) {
  const db = getDb();
  return db
    .prepare(
      "SELECT price, recorded_at FROM price_history WHERE token = ? ORDER BY recorded_at DESC LIMIT ?"
    )
    .all("SOL", limit);
}
