#!/usr/bin/env node

// Execute an OFT cross-chain transfer via the LayerZero Value Transfer API.
//
// Flow: get quote → select first (OFT) route → approve token → send bridge tx → poll status
//
// Requires: node 18+, viem (installed via test-app dependencies)
//
// Usage: node scripts/execute_oft_transfer.mjs
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

const SRC_CHAIN = "arbitrum";
const DST_CHAIN = "optimism";

const SRC_TOKEN = "0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9"; // USDT0 on Optimism
const DST_TOKEN = "0x01bff41798a0bcf287b996046ca68b395dbc1071"; // USDT0 on Arbitrum

const AMOUNT = "5000000"; // 5 USDT0 (6 decimals)
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
  const quote = quotes?.[0];

  if (!quote) throw new Error("No quotes returned");

  const routeType = quote.routeSteps?.[0]?.type ?? "unknown";
  console.log(`   Route type:  ${routeType}`);
  console.log(`   Quote ID:    ${quote.id}`);
  console.log(`   srcAmount:   ${quote.srcAmount} (${quote.srcAmountUsd} USD)`);
  console.log(`   dstAmount:   ${quote.dstAmount} (${quote.dstAmountUsd} USD)`);
  console.log(`   fee:         ${quote.feeUsd} USD (${quote.feePercent}%)`);
  console.log(`   duration:    ~${quote.duration.estimated}ms`);
  console.log(`   steps:       ${quote.userSteps.length} (${quote.userSteps.map((s) => s.description).join(" → ")})`);
  console.log();

  // ── 2. Execute user steps (approve tx + bridge tx) ────────────────────────
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
    }
  }

  // ── 3. Poll status ────────────────────────────────────────────────────────
  console.log("3) Polling transfer status...");
  const startTime = Date.now();
  const deadline = startTime + STATUS_TIMEOUT_MS;

  while (Date.now() < deadline) {
    const query = txHash ? `?txHash=${txHash}` : "";
    const statusRes = await fetch(
      `${API}/status/${encodeURIComponent(quote.id)}${query}`,
      {headers: HEADERS},
    );
    const statusData = await statusRes.json();
    const {status, explorerUrl} = statusData;

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
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
