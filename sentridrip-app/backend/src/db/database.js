import Database from "better-sqlite3";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { mkdirSync } from "fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = join(__dirname, "../../data/sentridrip.db");

let db;

export function initDb() {
  mkdirSync(join(__dirname, "../../data"), { recursive: true });
  db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  db.exec(`
    CREATE TABLE IF NOT EXISTS strategies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      wallet_name TEXT NOT NULL,
      from_token TEXT NOT NULL DEFAULT 'USDC',
      to_token TEXT NOT NULL DEFAULT 'SOL',
      amount_per_buy TEXT NOT NULL,
      target_price REAL NOT NULL,
      spend_limit TEXT NOT NULL,
      total_spent TEXT NOT NULL DEFAULT '0',
      expiry_date TEXT NOT NULL,
      chain TEXT NOT NULL DEFAULT 'solana',
      status TEXT NOT NULL DEFAULT 'active',
      max_buys INTEGER DEFAULT NULL,
      total_buys INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS strategy_tiers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      strategy_id INTEGER NOT NULL,
      tier_number INTEGER NOT NULL,
      target_price REAL NOT NULL,
      amount_per_buy TEXT NOT NULL,
      total_spent TEXT NOT NULL DEFAULT '0',
      total_buys INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'active',
      FOREIGN KEY (strategy_id) REFERENCES strategies(id)
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      strategy_id INTEGER NOT NULL,
      tx_hash TEXT,
      from_token TEXT NOT NULL,
      to_token TEXT NOT NULL,
      amount_in TEXT NOT NULL,
      amount_out TEXT,
      sol_price_at_execution REAL,
      status TEXT NOT NULL DEFAULT 'pending',
      error TEXT,
      executed_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (strategy_id) REFERENCES strategies(id)
    );

    CREATE TABLE IF NOT EXISTS price_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      token TEXT NOT NULL DEFAULT 'SOL',
      price REAL NOT NULL,
      recorded_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  console.log("Database initialized");
  return db;
}

export function getDb() {
  if (!db) throw new Error("Database not initialized. Call initDb() first.");
  return db;
}
