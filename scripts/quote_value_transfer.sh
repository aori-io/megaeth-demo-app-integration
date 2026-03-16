#!/bin/bash

# Quote the LayerZero Value Transfer API for a single cross-chain route.
#
# Requires: jq, curl
# Usage: ./scripts/quote_value_transfer.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
if [[ -f "$SCRIPT_DIR/../.env" ]]; then
    set -a; source "$SCRIPT_DIR/../.env"; set +a
fi

# ── Configure these ──────────────────────────────────────────────────────────
LZ_API_KEY="${VT_API_KEY:-}"

SRC_CHAIN="optimism"
DST_CHAIN="base"

SRC_TOKEN="0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85"   # OP USDC
DST_TOKEN="0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"   # Base USDC

AMOUNT="20000000"  # 20 USDC (6 decimals)

WALLET="0xa85463888B1ABfb023b134539B598dE00383953f"
# ─────────────────────────────────────────────────────────────────────────────

LZ_QUOTES_URL="https://transfer.layerzero-api.com/v1/quotes"
TIMEOUT=15

if [[ -z "$LZ_API_KEY" ]]; then
    echo "Error: LZ_API_KEY is not set."
    exit 1
fi

if ! command -v jq &>/dev/null; then
    echo "Error: jq is required. Install with: brew install jq"
    exit 1
fi

resp=$(mktemp)
trap 'rm -f "$resp"' EXIT

echo "Quoting: $SRC_CHAIN ($SRC_TOKEN) -> $DST_CHAIN ($DST_TOKEN)"
echo "Amount:  $AMOUNT"
echo ""

w=$(curl -s -o "$resp" -w "%{http_code}\n%{time_total}" --max-time "$TIMEOUT" \
    -X POST "$LZ_QUOTES_URL" \
    -H "x-api-key: $LZ_API_KEY" \
    -H "Content-Type: application/json" \
    -d "$(jq -n \
        --arg src "$SRC_CHAIN" --arg dst "$DST_CHAIN" \
        --arg srcToken "$SRC_TOKEN" --arg dstToken "$DST_TOKEN" \
        --arg wallet "$WALLET" --arg amount "$AMOUNT" \
        '{ srcChainKey: $src, dstChainKey: $dst, srcTokenAddress: $srcToken, dstTokenAddress: $dstToken, srcWalletAddress: $wallet, dstWalletAddress: $wallet, amount: $amount, options: { amountType: "EXACT_SRC_AMOUNT", feeTolerance: { type: "PERCENT", amount: 2 } } }')" 2>/dev/null)

http_code=$(echo "$w" | head -n 1)
time_s=$(echo "$w" | tail -n 1)
time_ms=$(awk -v t="$time_s" 'BEGIN { printf "%.0f", t * 1000 }')

echo "HTTP $http_code — ${time_ms} ms"
echo ""
jq . "$resp" 2>/dev/null || cat "$resp"
