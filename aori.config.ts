import type { AoriSwapWidgetConfig } from '@aori/mega-swap-widget';

export const aoriConfig: AoriSwapWidgetConfig = {
  vtApiBaseUrl: '/api/vt',
  walletConnectProjectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID!,
  rpcOverrides: {
    1: '/api/rpc/1',
    10: '/api/rpc/10',
    56: '/api/rpc/56',
    8453: '/api/rpc/8453',
    42161: '/api/rpc/42161',
    9745: '/api/rpc/9745',
    143: '/api/rpc/143',
    4326: '/api/rpc/4326',
  },
  theme: {
    mode: 'dark',
    light: {
      background: '#1a1a1a',
      foreground: '#0a0a0a',
      card: '#ffffff',
      'card-foreground': '#0a0a0a',
      popover: '#f5f5f5',
      'popover-foreground': '#0a0a0a',
      primary: '#FDB913',
      'primary-foreground': '#ffffff',
      secondary: '#111010',
      'secondary-foreground': '#171717',
      muted: '#f5f5f5',
      'muted-foreground': '#737373',
      accent: '#f5f5f5',
      'accent-foreground': '#171717',
      destructive: '#e7000b',
      'destructive-foreground': '#ffffff',
      border: '#e5e5e5',
      input: '#e5e5e5',
      ring: '#FDB913',
      radius: '0rem',
      'letter-spacing': '0em',
      'status-pending': '#a1a1aa',
      'status-received': '#f59e0b',
      'status-completed': '#10b981',
      'status-failed': '#ef4444',
    },
    dark: {
      background: '#141414',
      foreground: '#ffffff',
      card: '#141414',
      'card-foreground': '#ffffff',
      popover: '#1a1a1a',
      'popover-foreground': '#ffffff',
      primary: '#FDB913',
      'primary-foreground': '#000000',
      secondary: '#1a1a1a',
      'secondary-foreground': '#ffffff',
      muted: '#141414',
      'muted-foreground': '#6B7280',
      accent: '#1a1a1a',
      'accent-foreground': '#ffffff',
      destructive: '#ef4444',
      'destructive-foreground': '#ffffff',
      border: '#252525',
      input: '#0f0f0f',
      ring: '#FDB913',
      radius: '0.75rem',
      'border-style': 'solid',
      'shadow-opacity': '0',
      'font-sans': '"KHTeka", "Helvetica Neue", Helvetica, Arial, sans-serif',
      'font-mono': '"KHTekaMono", ui-monospace, monospace',
      'letter-spacing': '0.010em',
      'status-pending': '#a1a1aa',
      'status-received': '#FDB913',
      'status-completed': '#10b981',
      'status-failed': '#ef4444',
    },
  },
  tokens: {
    defaultBase: {
      chainId: 1,
      address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
    },
    defaultQuote: {
      chainId: 4326,
      address: '0xfafddbb3fc7688494971a79cc65dca3ef82079e7',
    },
    supportedInputTokens: [
      { chainId: 1, address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48' },     // USDC Ethereum
      { chainId: 1, address: '0xdAC17F958D2ee523a2206206994597C13D831ec7' },     // USDT Ethereum
      { chainId: 10, address: '0x0b2c639c533813f4aa9d7837caf62653d097ff85' },    // USDC Optimism
      { chainId: 10, address: '0x01bFF41798a0BcF287b996046Ca68b395DbC1071' },    // USDT0 Optimism
      { chainId: 143, address: '0x754704bc059f8c67012fed69bc8a327a5aafb603' },   // USDC Monad
      { chainId: 143, address: '0x6873213455565656565656565656565656565656' },   // USDT0 Monad
      { chainId: 8453, address: '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913' },  // USDC Base
      { chainId: 42161, address: '0xaf88d065e77c8cc2239327c5edb3a432268e5831' }, // USDC Arbitrum
      { chainId: 42161, address: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9' }, // USDT0 Arbitrum
    ],
    supportedOutputTokens: [
      { chainId: 4326, address: '0xfafddbb3fc7688494971a79cc65dca3ef82079e7' }, // USDC MegaETH
    ],
    supportedInputChains: [1, 10, 143, 8453, 42161],
    supportedOutputChains: [4326],
    inputSelectionSearch: true,
    outputSelectionSearch: false,
    showInputSelectionTokenBalances: true,
    showOutputSelectionTokenBalances: false,
    enabledChains: [1, 10, 56, 143, 4326, 8453, 42161],
    lockBase: false,
    lockQuote: false,
    disableInverting: false,
  },
  appearance: {
    widgetType: 'default',
    tokenDisplay: 'default',
    tokenBadgeOrientation: 'left',
    assetMenuVariant: 'default',
    amountInputVariant: 'default',
    hideAmountInputSymbol: false,
    quoteLoaderVariant: 'expanded',
    fillContainer: false,
    hideBorder: true,
    walletButtonEnabled: true,
  },
  settings: {
    defaultSlippage: 0.01,
  },
};