#!/usr/bin/env node
import { fileURLToPath } from "node:url";

export function check(ctx) {
  const expiryDate = process.env.SENTRIDRIP_EXPIRY_DATE;
  if (!expiryDate) return { allow: false, reason: "No expiry date configured" };
  const expiry = new Date(expiryDate);
  if (isNaN(expiry.getTime())) return { allow: false, reason: `Invalid expiry date: ${expiryDate}` };
  if (new Date() > expiry) return { allow: false, reason: `Strategy expired at ${expiry.toISOString()}` };
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
