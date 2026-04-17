#!/usr/bin/env node
import { fileURLToPath } from "node:url";

export function check(ctx) {
  const spendLimit = parseFloat(process.env.SENTRIDRIP_SPEND_LIMIT || "0");
  const totalSpent = parseFloat(process.env.SENTRIDRIP_TOTAL_SPENT || "0");
  const amountPerBuy = parseFloat(process.env.SENTRIDRIP_AMOUNT_PER_BUY || "0");

  if (spendLimit <= 0) return { allow: false, reason: "No spend limit configured" };
  if (totalSpent + amountPerBuy > spendLimit) {
    return { allow: false, reason: `Spend limit exceeded: $${(totalSpent + amountPerBuy).toFixed(2)} > $${spendLimit.toFixed(2)}` };
  }
  return { allow: true };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  let input = "";
  process.stdin.on("data", (c) => (input += c));
  process.stdin.on("end", () => {
    try { console.log(JSON.stringify(check(JSON.parse(input)))); }
    catch (e) { console.log(JSON.stringify({ allow: false, reason: e.message })); }
  });
}
