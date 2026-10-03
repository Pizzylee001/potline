import { createConfig } from "wagmi";
import { arbitrumSepolia } from "wagmi/chains";
import { injected } from "wagmi/connectors";
import { createArbitrumSepoliaTransport } from "./rpc";

/**
 * Wallet connection for the app. Injected connector only, no wallet kits.
 * React Query lives in the provider layer; wagmi v2 requires it.
 */
export const wagmiConfig = createConfig({
  chains: [arbitrumSepolia],
  connectors: [injected()],
  transports: {
    [arbitrumSepolia.id]: createArbitrumSepoliaTransport(),
  },
  ssr: true,
});

declare module "wagmi" {
  interface Register {
    config: typeof wagmiConfig;
  }
}
