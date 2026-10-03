import { createPublicClient } from "viem";
import { arbitrumSepolia } from "viem/chains";
import { createArbitrumSepoliaTransport } from "./rpc";

/** Read-only viem client for Arbitrum Sepolia. Used for all chain reads. */
export const publicClient = createPublicClient({
  chain: arbitrumSepolia,
  transport: createArbitrumSepoliaTransport(),
});
