/** Arbitrum Sepolia chain configuration and the fixed addresses this slice reads. */
export const CHAIN_ID = 421614 as const;
export const CHAIN_NAME = "Arbitrum Sepolia" as const;
export const EXPLORER_URL = "https://sepolia.arbiscan.io" as const;

export const USDG = {
  address: "0xFFC95faa3d63Cde504a05B567C600B78C0b41892",
  decimals: 6,
  symbol: "USDG",
} as const;

export const FACTORY_ADDRESS =
  "0xBE7c2Ec0Fa8B4D0B6523bC3e8D3325409Fc78d23" as const;
