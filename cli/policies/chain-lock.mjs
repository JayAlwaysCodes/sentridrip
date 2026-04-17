#!/usr/bin/env node
import { fileURLToPath } from "node:url";

export function check(ctx) {
  const chain = ctx.chain || ctx.transaction?.chain;
  if (!chain) return { allow: true };
  const allowed = chain === "solana" ||
    chain === "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp" ||
    chain === "solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1";
  if (!allowed) return { allow: false, reason: `Chain lock: only Solana allowed. Got: ${chain}` };
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
