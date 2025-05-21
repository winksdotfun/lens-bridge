import { WagmiProvider, createConfig, http } from "wagmi";
import { arbitrum, mainnet, optimism } from "wagmi/chains";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ConnectKitProvider, getDefaultConfig } from "connectkit";
import { createAcrossClient } from "@across-protocol/app-sdk";

import React from "react";

const client = createAcrossClient({
  integratorId: "0x0082", 
  chains: [mainnet, optimism, arbitrum],
});

const config = createConfig(
  getDefaultConfig({
    chains: [mainnet],
    transports: {
      [mainnet.id]: http(
        `https://eth-mainnet.g.alchemy.com/v2/sHUCKj3avsgc_b1afxgc_DHYkbq3kYzM`
      ),
    },
    walletConnectProjectId: "21111111111111111111111111111111",
    appName: "GHO Bridge",
    appDescription: "Bridge GHO to Lens chain",
    appUrl: "https://winks.fun", // update as needed
    appIcon: "/images/gho_logo.webp", // update as needed
  })
);

const queryClient = new QueryClient();

export const Web3Provider = ({ children }: { children: React.ReactNode }) => {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <ConnectKitProvider>{children}</ConnectKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}; 