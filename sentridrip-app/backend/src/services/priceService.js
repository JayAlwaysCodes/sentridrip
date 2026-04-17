import axios from "axios";
import { getDb } from "../db/database.js";

const COINGECKO_URL =
  "https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd";

let _cachedPrice = null;
let _lastFetched = 0;
const CACHE_TTL_MS = 30_000;

export async function getSolPrice() {
  const now = Date.now();
  if (_cachedPrice && now - _lastFetched < CACHE_TTL_MS) {
    return _cachedPrice;
  }

  try {
    const res = await axios.get(COINGECKO_URL, { timeout: 8000 });
    const price = res.data?.solana?.usd;
    if (!price) throw new Error("Invalid price response from CoinGecko");

    _cachedPrice = price;
    _lastFetched = now;

    try {
      const db = getDb();
      db.prepare("INSERT INTO price_history (token, price) VALUES (?, ?)").run("SOL", price);
    } catch (_) {}

    return price;
  } catch (err) {
    console.error(`Price fetch error: ${err.message}`);
    if (_cachedPrice) {
      console.warn("Using stale cached SOL price");
      return _cachedPrice;
    }
    throw new Error("Could not fetch SOL price and no cache available");
  }
}

export function getLastKnownPrice() {
  return _cachedPrice;
}

export async function getPriceHistory(limit = 60) {
  const db = getDb();
  return db
    .prepare(
      "SELECT price, recorded_at FROM price_history WHERE token = 'SOL' ORDER BY recorded_at DESC LIMIT ?"
    )
    .all(limit);
}
