import '../globals.css';
import '@rainbow-me/rainbowkit/styles.css';
import '@aori/mega-swap-widget/styles.css';
import type { AppProps } from 'next/app';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider } from 'wagmi';
import { RainbowKitProvider } from '@rainbow-me/rainbowkit';
import { WalletScreeningProvider } from '@aori/mega-swap-widget';

import { config } from '../wagmi';
import { aoriConfig } from '../../aori.config';

const client = new QueryClient();

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={client}>
        <RainbowKitProvider>
          <WalletScreeningProvider
            config={aoriConfig.walletScreening}
            onBlockedWallet={({ address, allowed, source }) => {
              if (!allowed) {
                console.warn(`Blocked wallet: ${address} (flagged by ${source})`);
              }
            }}
          >
            <Component {...pageProps} />
          </WalletScreeningProvider>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

export default MyApp;
