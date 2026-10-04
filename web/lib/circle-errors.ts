import { decodeErrorResult, toFunctionSelector } from "viem";
import { savingsCircleAbi } from "@/lib/abis/savings-circle";
import { formatUsdg } from "@/lib/format";

/** A revert decoded from SavingsCircle, with the values its error carries. */
export interface DecodedRevert {
  name: string;
  args: readonly unknown[];
}

/**
 * Every SavingsCircle error selector, lowercased. Only membership matters here:
 * decodeErrorResult does the real decoding from the ABI.
 */
const errorSelectors = new Set<string>();

for (const item of savingsCircleAbi) {
  if (item.type !== "error") continue;
  const signature = `${item.name}(${item.inputs.map((input) => input.type).join(",")})`;
  errorSelectors.add(toFunctionSelector(signature).toLowerCase());
}

/** Find the revert payload on an error chain, wherever the wallet nested it. */
function revertData(error: unknown): `0x${string}` | null {
  let current: unknown = error;

  for (let depth = 0; depth < 8 && current; depth += 1) {
    if (typeof current === "object" && current !== null) {
      const record = current as { data?: unknown; revert?: { data?: unknown }; cause?: unknown };

      for (const candidate of [record.data, record.revert?.data]) {
        if (typeof candidate === "string" && /^0x[0-9a-fA-F]{8,}$/.test(candidate)) {
          const selector = candidate.slice(0, 10).toLowerCase();
          if (errorSelectors.has(selector)) return candidate as `0x${string}`;
        }
      }
      current = record.cause;
      continue;
    }
    break;
  }

  return null;
}

/**
 * Decode a SavingsCircle custom error from a wagmi or viem error. Returns null
 * when the failure was a wallet rejection, a dropped chain, or a revert this
 * circle did not define.
 */
export function decodeCircleRevert(error: unknown): DecodedRevert | null {
  const data = revertData(error);
  if (!data) return null;

  try {
    const decoded = decodeErrorResult({ abi: savingsCircleAbi, data });
    return { name: decoded.errorName, args: decoded.args as readonly unknown[] };
  } catch {
    return null;
  }
}

function usdg(value: unknown): string {
  if (typeof value !== "bigint") return "0";
  return formatUsdg(value);
}

/**
 * Turn a decoded revert into interface copy that names the cause and the fix.
 * Each line reads as what happened then what to do about it.
 */
export function revertCopy(revert: DecodedRevert): string {
  switch (revert.name) {
    case "AlreadyMember":
      return "This address is already a member of the circle.";
    case "CircleFull":
      return "The circle is full and cannot take another member.";
    case "NotMember":
      return "This address has not joined the circle yet.";
    case "CircleIsCompleted":
      return "Every member has received the pot. The circle is settled.";
    case "AlreadyReceived":
      return "This address already took the pot in an earlier round.";
    case "AlreadyContributed":
      return "This address already paid this round.";
    case "RoundNotFull":
      return `Round not full: ${usdg(revert.args[0])} of ${usdg(revert.args[1])} members have paid. Wait for the rest to contribute.`;
    case "NoContributionThisRound":
      return "Contribute this round before placing a bid.";
    case "BidZero":
      return "Enter a bid above zero.";
    case "BidTooLow":
      return `Bid must beat the current top bid of ${usdg(revert.args[1])} USDG.`;
    case "BidAbovePot":
      return `Bid cannot be more than the pot of ${usdg(revert.args[1])} USDG.`;
    case "RoundAlreadySettled":
      return "This round is already closed.";
    case "NothingToClaim":
      return "No payout is waiting for this address.";
    case "NothingToWithdraw":
      return "No bid credit is waiting for this address.";
    case "SafeERC20FailedOperation":
      return "The USDG transfer failed. Check the balance and the approval.";
    case "ReentrancyGuardReentrantCall":
      return "The circle rejected a repeated call in the same transaction.";
    case "MaxMembersTooHigh":
      return "This circle was created with more members than the contract allows.";
    case "ZeroContribution":
    case "ZeroMaxMembers":
    case "ZeroToken":
      return "This circle was created with invalid settings.";
    default:
      return `The circle rejected the call with ${revert.name}.`;
  }
}
