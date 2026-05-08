import TelegramBot from "node-telegram-bot-api";

let _bot = null;

function getBot() {
  if (!_bot && process.env.TELEGRAM_BOT_TOKEN) {
    _bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN);
  }
  return _bot;
}

async function send(message) {
  const bot = getBot();
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!bot || !chatId) return;
  try {
    await bot.sendMessage(chatId, message, { parse_mode: "Markdown" });
  } catch (err) {
    console.error("[Telegram] Failed to send message: " + err.message);
  }
}

export async function notifySwapSuccess({ strategyName, tierNumber, amountIn, amountOut, solPrice, txHash }) {
  const solscan = txHash ? "\n[View on Solscan](https://solscan.io/tx/" + txHash + ")" : "";
  await send(
    "✅ *SentriDrip — Swap Executed!*\n\n" +
    "📋 Strategy: *" + strategyName + "*\n" +
    "🎯 Tier " + tierNumber + " triggered\n" +
    "💸 Spent: *$" + amountIn + " USDC*\n" +
    "🪙 Received: *" + amountOut + " SOL*\n" +
    "📈 SOL price: *$" + solPrice + "*" +
    solscan
  );
}

export async function notifySwapFailed({ strategyName, tierNumber, amountIn, solPrice, error }) {
  await send(
    "❌ *SentriDrip — Swap Failed*\n\n" +
    "📋 Strategy: *" + strategyName + "*\n" +
    "🎯 Tier " + tierNumber + "\n" +
    "💸 Amount: *$" + amountIn + " USDC*\n" +
    "📈 SOL price: *$" + solPrice + "*\n" +
    "⚠️ Reason: " + error
  );
}

export async function notifyStrategyCreated({ name, tiers, spendLimit, expiryDate }) {
  const tierLines = tiers.map((t, i) =>
    "  Tier " + (i + 1) + ": Buy $" + t.amount_per_buy + " USDC when SOL hits $" + t.target_price
  ).join("\n");
  await send(
    "🚀 *SentriDrip — New Strategy Active!*\n\n" +
    "📋 *" + name + "*\n\n" +
    "*Price Tiers:*\n" + tierLines + "\n\n" +
    "💰 Spend limit: *$" + spendLimit + " USDC*\n" +
    "⏰ Expires: *" + new Date(expiryDate).toLocaleDateString() + "*\n\n" +
    "The agent is now watching SOL price every 60 seconds 👀"
  );
}

export async function notifyStrategyCompleted({ name, totalSpent, totalBuys }) {
  await send(
    "🏁 *SentriDrip — Strategy Completed*\n\n" +
    "📋 *" + name + "*\n" +
    "✅ All tiers executed\n" +
    "💸 Total spent: *$" + totalSpent + " USDC*\n" +
    "🛒 Total buys: *" + totalBuys + "*"
  );
}

export async function notifyPriceCheck({ solPrice, strategiesChecked, tiersReady }) {
  if (tiersReady === 0) return;
  await send(
    "🎯 *SentriDrip — Target Price Reached!*\n\n" +
    "📈 SOL is at *$" + solPrice + "*\n" +
    "⚡ " + tiersReady + " tier(s) ready to execute\n" +
    "🤖 Executing swaps now..."
  );
}

export async function notifyStartup() {
  await send(
    "🤖 *SentriDrip Agent Started*\n\n" +
    "Monitoring SOL price every 60 seconds\n" +
    "All policies active and enforced\n\n" +
    "_Set your price. SentriDrip does the rest._"
  );
}
