import type { NextConfig } from "next";

/**
 * Two bundler adjustments, both driven by this machine:
 *
 * 1. `wagmi/connectors` is a barrel that re-exports every wallet connector
 *    (WalletConnect, MetaMask SDK, Base, Coinbase, Safe, Porto, Solana). Pulling
 *    it into the client bundle costs gigabytes of compiler memory and this box
 *    has 1.8 GB of RAM. The `injected` connector Potline actually uses lives in
 *    `@wagmi/core`, so the barrel is aliased to that module. Our source still
 *    imports the documented `wagmi/connectors` specifier.
 *
 * 2. Those barrels also drag in `@coinbase/cdp-sdk` and its optional `@x402/*`
 *    payment modules, which are not installed and are never reached by an
 *    injected connector. They resolve to an empty module.
 */
const nextConfig: NextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      "wagmi/connectors": "@wagmi/core",
      "@x402/evm/upto/client": false,
      "@x402/evm/exact/client": false,
      "@x402/core/client": false,
      "@x402/svm/exact/client": false,
      "@x402/evm": false,
    };
    return config;
  },
};

export default nextConfig;

