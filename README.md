# MegaETH Demo App Integration

Cross-chain swap widget demo that bridges assets into MegaETH, built with [Next.js](https://nextjs.org), [RainbowKit](https://www.rainbowkit.com), and [`@aori/mega-swap-widget`](https://www.npmjs.com/package/@aori/mega-swap-widget).

## Environment Variables

Copy `env.example` to `.env` and fill in the values:

```bash
cp env.example .env
```

| Variable | Required | Description |
| --- | --- | --- |
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | Yes | WalletConnect Cloud project ID. Prefixed with `NEXT_PUBLIC_` so Next.js exposes it to the browser (required for wallet connections). Get one at [cloud.walletconnect.com](https://cloud.walletconnect.com). |
| `VT_API_KEY` | Yes | Aori Value Transfer API key. Injected server-side by the `/api/vt` proxy — never exposed to the browser. |
| `PRIVATE_KEY` | Scripts only | Wallet private key used by the CLI transfer scripts (`npm run transfer:aori`, etc.). Not used by the web app. |
| `ETHEREUM_RPC_URL` | Yes | RPC endpoint for Ethereum (chain 1) |
| `OPTIMISM_RPC_URL` | Yes | RPC endpoint for Optimism (chain 10) |
| `BASE_RPC_URL` | Yes | RPC endpoint for Base (chain 8453) |
| `ARBITRUM_RPC_URL` | Yes | RPC endpoint for Arbitrum (chain 42161) |
| `MONAD_RPC_URL` | Yes | RPC endpoint for Monad (chain 143) |
| `MEGAETH_RPC_URL` | Yes | RPC endpoint for MegaETH (chain 4326) |

RPC URLs are read server-side by the `/api/rpc/[chainId]` proxy route. They are never sent to the client.

## Getting Started

```bash
npm install

npm run dev
```

The app starts at [http://localhost:3000](http://localhost:3000).


## Server-Side Proxying

The app keeps the API key and private RPC URLs off the client by routing all requests through two Next.js API routes:

**`/api/vt/[...path]`** — Proxies requests to the Aori Value Transfer API (`https://transfer.layerzero-api.com/v1`). The server injects the `VT_API_KEY` header automatically, so the widget config only needs `vtApiBaseUrl: '/api/vt'` with no client-side API key.

**`/api/rpc/[chainId]`** — Proxies JSON-RPC requests to the private RPC endpoint for the given chain. The widget and wagmi both send RPC calls to `/api/rpc/<chainId>`, and the server forwards them to the real RPC URL from the corresponding environment variable.

## Configuring the Widget

All widget configuration lives in `aori.config.ts`, which exports an `AoriSwapWidgetConfig` object. Below is a breakdown of each section and how to modify it.

### `vtApiBaseUrl`

```ts
vtApiBaseUrl: '/api/vt',
```

Points the widget at your server-side VT API proxy. Leave this as `/api/vt` unless you've moved the proxy route.

### `walletConnectProjectId`

```ts
walletConnectProjectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID!,
```

Reads the WalletConnect Cloud project ID from the `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` environment variable. The same variable is also used in `src/wagmi.ts` for RainbowKit's config.

### `rpcOverrides`

```ts
rpcOverrides: {
  1: '/api/rpc/1',       // Ethereum
  10: '/api/rpc/10',     // Optimism
  56: '/api/rpc/56',     // BSC
  8453: '/api/rpc/8453', // Base
  42161: '/api/rpc/42161', // Arbitrum
  9745: '/api/rpc/9745', // Plasma
  143: '/api/rpc/143',   // Monad
  4326: '/api/rpc/4326', // MegaETH
},
```

Overrides RPCs for the widget's internal viem clients (balance fetching, quote pricing). These relative paths point to the `/api/rpc/[chainId]` proxy, keeping real RPC URLs server-side. If you add a new chain, add an entry here **and** in the `RPC_URLS` map inside `src/pages/api/rpc/[chainId].ts`.

### `theme`

```ts
theme: {
  mode: 'dark',
  dark: { /* color overrides */ },
  light: { /* color overrides */ },
},
```

Controls the widget's visual theme. `mode` sets the active color scheme (`'dark'` or `'light'`). Each theme object accepts color tokens like `background`, `foreground`, `primary`, `border`, etc., plus `radius`, `font-sans`, `font-mono`, `letter-spacing`, and status colors (`status-pending`, `status-received`, `status-completed`, `status-failed`).

### `tokens`

This is the primary section to modify when changing which tokens and chains the widget supports.

```ts
tokens: {
  // Pre-selected token pair when the widget loads
  defaultBase: { chainId: 1, address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48' },   // USDC on Ethereum
  defaultQuote: { chainId: 4326, address: '0xfafddbb3fc7688494971a79cc65dca3ef82079e7' }, // USDC on MegaETH

  // Whitelist of tokens users can select as input (source)
  supportedInputTokens: [
    { chainId: 1, address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48' },  // USDC Ethereum
    { chainId: 10, address: '0x0b2c639c533813f4aa9d7837caf62653d097ff85' }, // USDC Optimism
    // ...
  ],

  // Whitelist of tokens users can select as output (destination)
  supportedOutputTokens: [
    { chainId: 4326, address: '0xfafddbb3fc7688494971a79cc65dca3ef82079e7' }, // USDC MegaETH
    { chainId: 4326, address: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee' }, // ETH MegaETH
  ],

  // Which chains appear in the input/output chain selectors
  supportedInputChains: [1, 10, 143, 8453, 42161],
  supportedOutputChains: [4326],

  // All chains the widget is aware of (superset of input + output chains)
  enabledChains: [1, 10, 56, 143, 4326, 8453, 42161],

  // Token selector search behavior
  inputSelectionSearch: true,
  outputSelectionSearch: false,
  showInputSelectionTokenBalances: true,
  showOutputSelectionTokenBalances: false,

  // Lock the base or quote token so users can't change it
  lockBase: false,
  lockQuote: false,

  // Hide the swap-direction arrow
  disableInverting: true,
},
```

All token/chain fields are optional — omit them entirely to allow all supported tokens and chains. For this MegaETH demo, the config restricts output to MegaETH only and input to a curated set of stablecoins and ETH across major L1/L2s.

To add a new input token, append a `{ chainId, address }` entry to `supportedInputTokens` and make sure its chain is in `supportedInputChains` and `enabledChains`.

### `appearance`

```ts
appearance: {
  widgetType: 'default',           // Layout: 'default' | 'compact' | 'horizontal' | 'split'
  tokenDisplay: 'default',         // How tokens are shown in the selector
  tokenBadgeOrientation: 'left',   // Badge position
  assetMenuVariant: 'default',     // Asset menu style
  amountInputVariant: 'default',   // Amount input style
  hideAmountInputSymbol: false,    // Hide the token symbol in the amount input
  quoteLoaderVariant: 'expanded',  // Quote loading indicator style
  fillContainer: false,            // Expand to fill parent container
  hideBorder: true,                // Remove the widget's outer border
  walletButtonEnabled: false,      // Hide the widget's built-in wallet button (using RainbowKit instead)
},
```

### `settings`

```ts
settings: {
  defaultSlippage: 0.01, // 1% default slippage tolerance
},
```

## Wagmi Configuration

The wagmi config in `src/wagmi.ts` uses helper exports from the widget package:

- **`wagmiChains`** — all Aori-supported chains, pre-configured. Your wagmi config must include all of these or approvals, wrapping/unwrapping, and chain switching will fail silently.
- **`buildTransports()`** — provides RPC transports with built-in fallback (multiple public RPCs per chain, tried in order on error or rate-limit).

```ts
import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { wagmiChains, buildTransports } from '@aori/mega-swap-widget';

const wagmiConfig = getDefaultConfig({
  appName: 'MegaETH Example',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID!,
  chains: wagmiChains,
  transports: buildTransports(),
  ssr: false,
});
```

Note that wagmi transports are separate from the widget's `rpcOverrides`. The `rpcOverrides` affect the widget's internal viem clients, while `buildTransports()` configures wagmi for signing and sending transactions. Any URLs passed to `buildTransports` are client-side JavaScript — never pass private RPC URLs directly.

## Scripts

Test scripts live in `scripts/` and read `PRIVATE_KEY` and `VT_API_KEY` from the `.env` file.

```bash
# Quote the Value Transfer API for a single route
npm run quote

# Execute an Aori (intent-based) cross-chain transfer
npm run transfer:aori

# Execute an OFT cross-chain transfer
npm run transfer:oft
```
