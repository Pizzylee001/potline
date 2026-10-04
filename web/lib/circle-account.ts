import type { Address } from "viem";
import { erc20Abi } from "viem";
import { publicClient } from "./public-client";
import { savingsCircleAbi } from "./abis/savings-circle";

/**
 * Everything about the connected address that the circle view needs but that is
 * not part of the shared circle state: its membership, its recorded payout, its
 * bid credit, and how much USDG it has approved the circle to pull.
 */
export interface CircleAccountState {
  address: Address;
  isMember: boolean;
  hasReceived: boolean;
  claimable: bigint;
  claimablePayout: bigint;
  /** USDG this address has approved the circle to pull. */
  allowance: bigint;
}

/**
 * Read the connected address against one circle. The ERC20 allowance read is
 * isolated: a token that does not answer must not blank the whole panel, so the
 * allowance falls back to zero and the panel asks for approval.
 */
export async function loadCircleAccount(
  circle: Address,
  token: Address,
  account: Address,
): Promise<CircleAccountState> {
  let base: readonly unknown[];
  try {
    base = await publicClient.multicall({
      contracts: [
        { address: circle, abi: savingsCircleAbi, functionName: "isMember", args: [account] },
        { address: circle, abi: savingsCircleAbi, functionName: "hasReceived", args: [account] },
        { address: circle, abi: savingsCircleAbi, functionName: "claimable", args: [account] },
        { address: circle, abi: savingsCircleAbi, functionName: "claimablePayout", args: [account] },
      ],
      allowFailure: false,
    });
  } catch {
    // Nothing is enabled while these reads fail. Zeros disable every write.
    return {
      address: account,
      isMember: false,
      hasReceived: false,
      claimable: 0n,
      claimablePayout: 0n,
      allowance: 0n,
    };
  }

  let allowance = 0n;
  try {
    allowance = await publicClient.readContract({
      address: token,
      abi: erc20Abi,
      functionName: "allowance",
      args: [account, circle],
    });
  } catch {
    allowance = 0n;
  }

  return {
    address: account,
    isMember: Boolean(base[0]),
    hasReceived: Boolean(base[1]),
    claimable: (base[2] as bigint | undefined) ?? 0n,
    claimablePayout: (base[3] as bigint | undefined) ?? 0n,
    allowance,
  };
}