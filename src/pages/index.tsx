import { ConnectButton } from '@rainbow-me/rainbowkit';
import type { NextPage } from 'next';
import { SwapWidget } from '@aori/mega-swap-widget';
import { aoriConfig } from '../../aori.config';
import { useConnectModal, useAccountModal } from '@rainbow-me/rainbowkit';

const Home: NextPage = () => {
  const { openConnectModal } = useConnectModal();
  const { openAccountModal } = useAccountModal();

  return (
    <div className="w-screen h-screen bg-[#19191A] flex flex-col">
      <div className="flex flex-row justify-end p-8">
        <ConnectButton chainStatus="none" showBalance={false} />
      </div>
      <div id="widget-container" className="w-full flex-1 flex justify-center items-center">
        <div className="w-md flex justify-center items-center border border-white">
        <SwapWidget 
          config={aoriConfig}
          customWalletUI="provider"
          onRequestConnect={() => openConnectModal?.()}
          onRequestAccount={() => openAccountModal?.()}
          onSwapComplete={({ aoriOrderHash, explorerUrl, details }) => {
            console.log('[SwapComplete] Order settled on-chain');
            console.log('  Order hash:', aoriOrderHash);
            console.log('  Explorer:', explorerUrl);
            console.log('  Details:', details);
            console.log('  Events:', details.events);
          }}
        />
        </div>
      </div>
    </div>
  );
};

export default Home;
