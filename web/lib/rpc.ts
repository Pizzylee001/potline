import { fallback, http } from "viem";

/**
 * Arbitrum Sepolia RPC endpoints, tried in order.
 *
 * The env value, when set, goes first. The three public endpoints follow so the
 * app never depends on a single flaky host. The official RPC also accepts the
 * widest eth_getLogs range, which the event reads rely on.
 */
const OFFICIAL = "https://sepolia-rollup.arbitrum.io/rpc";
const PUBLICNODE = "https://arbitrum-sepolia-rpc.publicnode.com";
const DRPC = "https://arbitrum-sepolia.drpc.org";

const envRpc = process.env.NEXT_PUBLIC_ARB_SEPOLIA_RPC_URL;

export const rpcUrls: string[] = [envRpc, OFFICIAL, PUBLICNODE, DRPC].filter(
  (url): url is string => typeof url === "string" && url.trim().length > 0,
);

/** A viem fallback transport that rotates across the configured endpoints. */
export function createArbitrumSepoliaTransport() {
  return fallback(
    rpcUrls.map((url) =>
      http(url, {
        retryCount: 1,
        timeout: 20_000,
      }),
    ),
  );
}
