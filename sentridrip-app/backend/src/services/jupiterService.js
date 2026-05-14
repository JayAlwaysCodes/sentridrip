import axios from "axios";

const JUPITER_QUOTE_API = "https://lite-api.jup.ag/swap/v1/quote";
const JUPITER_SWAP_API = "https://lite-api.jup.ag/swap/v1/swap";

// Token mint addresses on Solana mainnet
const TOKEN_MINTS = {
  SOL: "So11111111111111111111111111111111111111112",
  USDC: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
};

const DECIMALS = {
  SOL: 9,
  USDC: 6,
};

export async function getJupiterQuote({ fromToken, toToken, amount }) {
  const inputMint = TOKEN_MINTS[fromToken.toUpperCase()];
  const outputMint = TOKEN_MINTS[toToken.toUpperCase()];

  if (!inputMint || !outputMint) {
    throw new Error("Unsupported token pair. Only SOL and USDC supported.");
  }

  const decimals = DECIMALS[fromToken.toUpperCase()];
  const amountInSmallestUnit = Math.floor(parseFloat(amount) * Math.pow(10, decimals));

  const res = await axios.get(JUPITER_QUOTE_API, {
    params: {
      inputMint,
      outputMint,
      amount: amountInSmallestUnit,
      slippageBps: 50,
    },
    timeout: 10000,
  });

  const quote = res.data;
  const outDecimals = DECIMALS[toToken.toUpperCase()];
  const estimatedOutput = parseInt(quote.outAmount) / Math.pow(10, outDecimals);

  return {
    quote,
    inputMint,
    outputMint,
    amountInSmallestUnit,
    estimatedOutput: estimatedOutput.toFixed(6),
    fromToken: fromToken.toUpperCase(),
    toToken: toToken.toUpperCase(),
    amount,
  };
}

export async function executeJupiterSwap({ quoteData, walletAddress }) {
  const swapRes = await axios.post(JUPITER_SWAP_API, {
    quoteResponse: quoteData.quote,
    userPublicKey: walletAddress,
    wrapAndUnwrapSol: true,
    dynamicComputeUnitLimit: true,
    prioritizationFeeLamports: "auto",
  }, { timeout: 15000 });

  return swapRes.data;
}

export { TOKEN_MINTS, DECIMALS };
