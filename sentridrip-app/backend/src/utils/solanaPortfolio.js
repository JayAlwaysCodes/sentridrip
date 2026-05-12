
import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';

const connection = new Connection(
  process.env.SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com",
  "confirmed"
);

export async function getSolanaPortfolio(address) {
  try {
    const pubkey = new PublicKey(address);

    const balanceLamports = await connection.getBalance(pubkey);
    const solBalance = Number((balanceLamports / LAMPORTS_PER_SOL).toFixed(6));

    return {
      success: true,
      source: "solana-rpc",
      data: {
        address: address,
        total_value: solBalance * 145, // approximate SOL price
        portfolio_value: solBalance * 145,
        positions: [
          {
            asset: "SOL",
            symbol: "SOL",
            amount: solBalance,
            value: solBalance * 145,
            price: 145,
            chain: "solana",
            type: "native"
          }
        ],
        last_updated: new Date().toISOString()
      }
    };
  } catch (err) {
    console.error("Solana Portfolio Error:", err.message);
    throw err;
  }
}