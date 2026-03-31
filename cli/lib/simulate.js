/**
 * Transaction simulation — Blockaid risk assessment via Zerion proxy.
 *
 * When the Blockaid endpoint is available, POST the transaction for full
 * risk analysis. When unavailable, fall back to basic checks using the
 * swap API's estimation and precondition data.
 *
 * Configure: zerion config set simulationEndpoint https://api.zerion.io/v1/simulation/
 * Or env: ZERION_SIMULATION_ENDPOINT=https://...
 */

import { getApiKey, getConfigValue } from "./config.js";
import { basicAuthHeader } from "./api-client.js";

function getSimulationEndpoint() {
  return (
    process.env.ZERION_SIMULATION_ENDPOINT ||
    getConfigValue("simulationEndpoint") ||
    null
  );
}

/**
 * Simulate a transaction for risk assessment.
 *
 * @param {object} params
 * @param {object} params.transaction - { to, from, data, value } from swap API
 * @param {string} params.chainId - Zerion chain ID (e.g., "base")
 * @param {object} params.estimation - { input_quantity, output_quantity, gas } from swap API
 * @param {object} params.preconditions - { enough_balance, enough_allowance } from swap API
 * @returns {SimulationResult}
 */
export async function simulateTransaction({ transaction, chainId, estimation, preconditions }) {
  const endpoint = getSimulationEndpoint();

  // Try Blockaid endpoint if configured
  if (endpoint) {
    try {
      return await simulateViaBlockaid(endpoint, transaction, chainId);
    } catch (err) {
      // Blockaid failed — fall back to basic simulation
      return basicSimulation({ transaction, estimation, preconditions, warning: err.message });
    }
  }

  // No endpoint configured — use basic simulation
  return basicSimulation({ transaction, estimation, preconditions });
}

async function simulateViaBlockaid(endpoint, transaction, chainId) {
  const apiKey = getApiKey();

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: basicAuthHeader(apiKey),
    },
    body: JSON.stringify({
      chain_id: chainId,
      transaction: {
        to: transaction.to,
        from: transaction.from,
        data: transaction.data,
        value: transaction.value || "0",
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Simulation endpoint returned ${response.status}`);
  }

  const data = await response.json();

  return {
    source: "blockaid",
    safe: data.safe ?? null,
    severity: data.severity || "unknown",
    warnings: data.warnings || [],
    details: data.simulation || {},
  };
}

function basicSimulation({ transaction, estimation, preconditions, warning }) {
  const warnings = [];

  if (warning) {
    warnings.push(`Blockaid unavailable: ${warning}`);
  }

  // Check preconditions
  if (preconditions?.enough_balance === false) {
    warnings.push("Insufficient balance for this transaction");
  }
  if (preconditions?.enough_allowance === false) {
    warnings.push("Token approval required — will be submitted before the swap");
  }

  // Check for suspicious transaction targets
  if (transaction?.to === "0x0000000000000000000000000000000000000000") {
    warnings.push("Transaction target is the zero address");
  }
  if (!transaction?.data || transaction.data === "0x") {
    warnings.push("Transaction has no calldata — may be a plain transfer, not a swap");
  }

  // Check gas estimation
  if (estimation?.gas && estimation.gas > 1000000) {
    warnings.push(`High gas estimate: ${estimation.gas} — complex transaction`);
  }

  // Check output
  if (estimation?.output_quantity?.float === 0) {
    warnings.push("Estimated output is 0 — transaction may fail or result in loss");
  }

  const safe = warnings.filter((w) => !w.startsWith("Blockaid")).length === 0;

  return {
    source: "basic",
    safe,
    severity: safe ? "none" : "medium",
    warnings,
    details: {
      estimatedOutput: estimation?.output_quantity?.float,
      estimatedGas: estimation?.gas,
    },
  };
}
