import { formatUnits } from "viem";
import { USDG } from "./chain";

/** Group the integer part, keep at most `maxFractionDigits`, drop trailing zeros. */
export function formatAmount(
  value: bigint,
  decimals: number,
  maxFractionDigits = 2,
): string {
  const raw = formatUnits(value, decimals);
  const [intPart, fracPart = ""] = raw.split(".");
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const frac = fracPart.slice(0, maxFractionDigits).replace(/0+$/, "");
  return frac.length > 0 ? `${grouped}.${frac}` : grouped;
}

/** Format a token amount in USDG units, no currency symbol. */
export function formatUsdg(value: bigint, maxFractionDigits = 2): string {
  return formatAmount(value, USDG.decimals, maxFractionDigits);
}

/** Shorten an address for display. Caller keeps the full value in a title. */
export function truncateAddress(address: string, lead = 6, tail = 4): string {
  if (address.length <= lead + tail + 1) return address;
  return `${address.slice(0, lead)}...${address.slice(-tail)}`;
}

export function sameAddress(a?: string | null, b?: string | null): boolean {
  if (!a || !b) return false;
  return a.toLowerCase() === b.toLowerCase();
}
