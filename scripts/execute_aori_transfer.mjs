#!/usr/bin/env node

// Execute an Aori cross-chain transfer via the LayerZero Value Transfer API.
//
// Flow: get quote → select AORI_V1 route → approve token → sign EIP-712 order → submit signature → poll status
//
// Requires: node 18+, viem (installed via test-app dependencies)
//
// Usage: node scripts/execute_aori_transfer.mjs
//        Reads PRIVATE_KEY and VT_API_KEY from .env

import {readFileSync} from "fs";
import {resolve, dirname} from "path";
import {fileURLToPath} from "url";
import {createWalletClient, createPublicClient, http} from "viem";
import {privateKeyToAccount} from "viem/accounts";
import {optimism, base, mainnet, arbitrum} from "viem/chains";

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, "..", ".env");
const env = Object.fromEntries(
  readFileSync(envPath, "utf8")
    .split("\n")
    .filter((l) => l && !l.startsWith("#"))
    .map((l) => l.replace(/^export\s+/, ""))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, "")];
    }),
);

// ── Configure these ──────────────────────────────────────────────────────────
const LZ_API_KEY = env.VT_API_KEY;
const PRIVATE_KEY = env.PRIVATE_KEY;

const SRC_CHAIN = "optimism";
const DST_CHAIN = "base";

const SRC_TOKEN = "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85"; // OP USDC
const DST_TOKEN = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"; // Base USDC

const AMOUNT = "20000000"; // 20 USDC (6 decimals)
// ─────────────────────────────────────────────────────────────────────────────

const API = "https://transfer.layerzero-api.com/v1";
const HEADERS = {"x-api-key": LZ_API_KEY, "Content-Type": "application/json"};

const CHAIN_MAP = {
  ethereum: mainnet,
  optimism: optimism,
  base: base,
  arbitrum: arbitrum,
};

const STATUS_POLL_INTERVAL_MS = 4000;
const STATUS_TIMEOUT_MS = 5 * 60 * 1000;

async function main() {
  const account = privateKeyToAccount(PRIVATE_KEY);
  const viemChain = CHAIN_MAP[SRC_CHAIN];
  if (!viemChain) throw new Error(`Unsupported chain: ${SRC_CHAIN}`);

  const wallet = createWalletClient({account, chain: viemChain, transport: http()});
  const client = createPublicClient({chain: viemChain, transport: http()});

  console.log(`Wallet:  ${account.address}`);
  console.log(`Route:   ${SRC_CHAIN} (${SRC_TOKEN}) -> ${DST_CHAIN} (${DST_TOKEN})`);
  console.log(`Amount:  ${AMOUNT}`);
  console.log();

  // ── 1. Get quote ──────────────────────────────────────────────────────────
  console.log("1) Requesting quote...");
  const quoteRes = await fetch(`${API}/quotes`, {
    method: "POST",
    headers: HEADERS,
    body: JSON.stringify({
      srcChainKey: SRC_CHAIN,
      dstChainKey: DST_CHAIN,
      srcTokenAddress: SRC_TOKEN,
      dstTokenAddress: DST_TOKEN,
      srcWalletAddress: account.address,
      dstWalletAddress: account.address,
      amount: AMOUNT,
      options: {amountType: "EXACT_SRC_AMOUNT", feeTolerance: {type: "PERCENT", amount: 2}},
    }),
  });

  if (!quoteRes.ok) {
    const body = await quoteRes.text();
    throw new Error(`Quote request failed (HTTP ${quoteRes.status}): ${body}`);
  }

  const {quotes} = await quoteRes.json();
  const quote = quotes?.find((q) => q.routeSteps?.[0]?.type === "AORI_V1");

  if (!quote) {
    console.error("Available routes:", quotes?.map((q) => q.routeSteps?.[0]?.type));
    throw new Error("No AORI_V1 route found in quotes");
  }

  console.log(`   Quote ID:    ${quote.id}`);
  console.log(`   srcAmount:   ${quote.srcAmount} (${quote.srcAmountUsd} USD)`);
  console.log(`   dstAmount:   ${quote.dstAmount} (${quote.dstAmountUsd} USD)`);
  console.log(`   fee:         ${quote.feeUsd} USD (${quote.feePercent}%)`);
  console.log(`   duration:    ~${quote.duration.estimated}ms`);
  console.log();

  // ── 2. Execute user steps (approve tx + EIP-712 signature) ────────────────
  let txHash;

  for (let i = 0; i < quote.userSteps.length; i++) {
    const step = quote.userSteps[i];
    console.log(`2.${i + 1}) ${step.type}: ${step.description}`);

    if (step.type === "TRANSACTION") {
      const tx = step.transaction.encoded;
      txHash = await wallet.sendTransaction({
        account,
        to: tx.to,
        data: tx.data,
        value: BigInt(tx.value ?? "0"),
        chain: viemChain,
      });
      console.log(`     tx hash: ${txHash}`);
      console.log("     waiting for receipt...");
      const receipt = await client.waitForTransactionReceipt({hash: txHash});
      console.log(`     confirmed in block ${receipt.blockNumber} (status: ${receipt.status})`);
      if (receipt.status === "reverted") throw new Error("Transaction reverted");
      console.log();
    } else if (step.type === "SIGNATURE") {
      const typed = step.signature.typedData;

      const normalizedMessage = {
        ...typed.message,
        inputAmount: BigInt(typed.message.inputAmount),
        outputAmount: BigInt(typed.message.outputAmount),
        startTime: BigInt(typed.message.startTime),
        endTime: BigInt(typed.message.endTime),
      };

      const signature = await wallet.signTypedData({
        account,
        domain: typed.domain,
        types: typed.types,
        primaryType: typed.primaryType,
        message: normalizedMessage,
      });
      console.log(`     signature: ${signature.slice(0, 20)}...`);

      console.log("     submitting signature...");
      const submitRes = await fetch(`${API}/submit-signature`, {
        method: "POST",
        headers: HEADERS,
        body: JSON.stringify({quoteId: quote.id, signatures: [signature]}),
      });

      if (!submitRes.ok) {
        const body = await submitRes.text();
        throw new Error(`Signature submission failed (HTTP ${submitRes.status}): ${body}`);
      }
      console.log("     signature accepted");
      console.log();
    }
  }

  // ── 3. Poll status ────────────────────────────────────────────────────────
  console.log("3) Polling transfer status...");
  const deadline = Date.now() + STATUS_TIMEOUT_MS;

  while (Date.now() < deadline) {
    const query = txHash ? `?txHash=${txHash}` : "";
    const statusRes = await fetch(
      `${API}/status/${encodeURIComponent(quote.id)}${query}`,
      {headers: HEADERS},
    );
    const statusData = await statusRes.json();
    const {status, explorerUrl} = statusData;

    const elapsed = ((Date.now() - (deadline - STATUS_TIMEOUT_MS)) / 1000).toFixed(0);
    console.log(`   [${elapsed}s] status: ${status}`);

    if (status === "SUCCEEDED") {
      console.log();
      console.log("Transfer complete!");
      if (explorerUrl) console.log(`Explorer: ${explorerUrl}`);
      return;
    }

    if (status === "FAILED") throw new Error("Transfer failed");

    await new Promise((r) => setTimeout(r, STATUS_POLL_INTERVAL_MS));
  }

  throw new Error("Timed out waiting for transfer to complete");
}

main().catch((err) => {
  console.error("\nError:", err.message ?? err);
  process.exit(1);
});
