import { parseUnits } from "viem";
import type { CircleData } from "@/lib/circle-data";
import type { CircleAccountState } from "@/lib/circle-account";
import { USDG } from "@/lib/chain";
import { formatUsdg, sameAddress } from "@/lib/format";

/**
 * The write actions a connected address can consider on one circle, and why each
 * one is or is not available right now. Every condition mirrors a check in
 * SavingsCircle, so a disabled row teaches the same rule the contract holds.
 */
export type ActionId =
  | "join"
  | "approve"
  | "contribute"
  | "bid"
  | "settleRound"
  | "claim"
  | "withdrawCredit";

export interface ActionAvailability {
  id: ActionId;
  /** The row always renders, enabled or not. */
  label: string;
  /** One line naming the action and its effect. */
  description: string;
  /** True when the button can be pressed. */
  enabled: boolean;
  /** Why it is disabled. Null when enabled. */
  reason: string | null;
  /** True when it is unavailable because the wallet already met its goal. */
  satisfied: boolean;
}

export interface ActionContext {
  circle: CircleData;
  account: CircleAccountState;
  /** True once the connected address's own chain reads have landed. */
  accountLoaded: boolean;
}

/** This circle's member row for the connected address, or null when not joined. */
export function memberRow(circle: CircleData, address: string) {
  return circle.members.find((row) => sameAddress(row.address, address)) ?? null;
}

/** Round progress for the settle copy, for example "3 of 4 paid". */
export function roundProgress(circle: CircleData): string {
  return `${circle.contributedCount.toString()} of ${circle.memberCount.toString()} paid`;
}

/** Client-side check of a typed bid. Returns the reason it cannot be sent. */
export function bidValidation(
  circle: CircleData,
  raw: string,
): { ok: true; amount: bigint } | { ok: false; message: string } {
  const trimmed = raw.trim();
  if (trimmed.length === 0) return { ok: false, message: "Enter a bid amount." };

  if (!/^\d*\.?\d*$/.test(trimmed) || trimmed === ".") {
    return { ok: false, message: "Use numbers only, for example 12.50" };
  }

  let amount: bigint;
  try {
    amount = parseUnits(trimmed, USDG.decimals);
  } catch {
    return {
      ok: false,
      message: `USDG has ${USDG.decimals} decimals, so the smallest bid is 0.000001.`,
    };
  }

  if (amount <= 0n) return { ok: false, message: "Enter an amount above zero." };

  if (amount <= circle.topBid) {
    return {
      ok: false,
      message: `Bid must beat the top bid of ${formatUsdg(circle.topBid)} USDG.`,
    };
  }

  if (amount > circle.potThisRound) {
    return {
      ok: false,
      message: `Bid cannot be more than the pot of ${formatUsdg(circle.potThisRound)} USDG.`,
    };
  }

  return { ok: true, amount };
}

/** Reason shown while the connected address's own reads are still in flight. */
const LOADING = "Reading your position in the circle.";

/**
 * Build every action row for the connected address. No row is ever removed: a
 * disabled row carries the rule that blocks it, so the mechanics stay legible.
 */
export function describeActions({
  circle,
  account,
  accountLoaded,
}: ActionContext): ActionAvailability[] {
  const you = memberRow(circle, account.address);
  const isMember = accountLoaded && account.isMember;
  const paid = accountLoaded && (you?.contributedThisRound ?? false);
  const received = accountLoaded && (you?.hasReceived ?? false);
  const hasRoom = circle.memberCount < circle.maxMembers;
  const needsApproval = accountLoaded && account.allowance < circle.contributionAmount;
  const canContribute = accountLoaded && isMember && !circle.completed && !paid;

  const join: ActionAvailability = {
    id: "join",
    label: "Join circle",
    description: "Add your address to the circle and take a place in the turn order.",
    enabled: accountLoaded && !isMember && hasRoom && !circle.completed,
    reason: !accountLoaded
      ? LOADING
      : isMember
        ? "Already a member"
        : !hasRoom
          ? "Circle is full"
          : circle.completed
            ? "Circle is completed"
            : null,
    satisfied: isMember,
  };

  const approve: ActionAvailability = {
    id: "approve",
    label: "Approve USDG",
    description: `Let the circle pull ${formatUsdg(circle.contributionAmount)} USDG for this round.`,
    enabled: canContribute && needsApproval,
    reason: !accountLoaded
      ? LOADING
      : !isMember
        ? "Join the circle first"
        : circle.completed
          ? "Circle is completed"
          : paid
            ? "Already paid this round"
            : needsApproval
              ? null
              : "Approved for this round",
    satisfied: accountLoaded && !needsApproval,
  };

  const contribute: ActionAvailability = {
    id: "contribute",
    label: "Contribute",
    description: `Pay this round's contribution of ${formatUsdg(circle.contributionAmount)} USDG.`,
    enabled: canContribute && !needsApproval,
    reason: !accountLoaded
      ? LOADING
      : !isMember
        ? "Join the circle first"
        : circle.completed
          ? "Circle is completed"
          : paid
            ? "Already paid this round"
            : needsApproval
              ? "Approve USDG first"
              : null,
    satisfied: paid,
  };

  const bid: ActionAvailability = {
    id: "bid",
    label: "Bid",
    description: "Offer part of the pot for the right to take it this round.",
    enabled: accountLoaded && isMember && paid && !received && !circle.completed,
    reason: !accountLoaded
      ? LOADING
      : !isMember
        ? "Join the circle first"
        : circle.completed
          ? "Circle is completed"
          : received
            ? "You already received the pot"
            : !paid
              ? "Contribute before bidding"
              : null,
    satisfied: false,
  };

  const roundFull =
    circle.memberCount > 0n && circle.contributedCount === circle.memberCount;

  const settleRound: ActionAvailability = {
    id: "settleRound",
    label: "Settle round",
    description: "Close this round and pay out. Anyone can call it once the round is full.",
    enabled: accountLoaded && roundFull && !circle.completed,
    reason: !accountLoaded
      ? LOADING
      : circle.completed
        ? "Circle is completed"
        : roundFull
          ? null
          : `Round not full: ${roundProgress(circle)}`,
    satisfied: circle.completed,
  };

  const claim: ActionAvailability = {
    id: "claim",
    label: "Claim payout",
    description: "Pull the pot recorded for you when the round settled.",
    enabled: accountLoaded && account.claimablePayout > 0n,
    reason: !accountLoaded
      ? LOADING
      : account.claimablePayout > 0n
        ? null
        : "Nothing to claim",
    satisfied: false,
  };

  const withdrawCredit: ActionAvailability = {
    id: "withdrawCredit",
    label: "Withdraw credit",
    description: "Pull the bid share credited to you when another member bid.",
    enabled: accountLoaded && account.claimable > 0n,
    reason: !accountLoaded
      ? LOADING
      : account.claimable > 0n
        ? null
        : "Nothing to withdraw",
    satisfied: false,
  };

  return [join, approve, contribute, bid, settleRound, claim, withdrawCredit];
}
