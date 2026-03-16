import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { wagmiChains, buildTransports } from '@aori/mega-swap-widget';
import { aoriConfig } from '../aori.config';

const wagmiConfig = getDefaultConfig({
  appName: 'MegaETH Rabbithole',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID!,
  chains: wagmiChains,
  transports: buildTransports(aoriConfig.rpcOverrides),
  ssr: false,
});

export const config = wagmiConfig;
