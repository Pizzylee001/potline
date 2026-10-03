import type { AbiEvent, Address } from "viem";
import { isAddress } from "viem";
import { publicClient } from "./public-client";
import { savingsCircleAbi } from "./abis/savings-circle";

export type CircleErrorKind =
  | "invalid-address"
  | "not-a-contract"
  | "not-a-circle"
  | "rpc";

export class CircleError extends Error {
  kind: CircleErrorKind;

  constructor(kind: CircleErrorKind, message: string, options?: { cause?: unknown }) {
    super(message);
    this.name = "CircleError";
    this.kind = kind;
    if (options?.cause !== undefined) {
      this.cause = options.cause;
    }
  }
}

export interface MemberRow {
  address: Address;
  index: number;
  hasReceived: boolean;
  claimable: bigint;
  contributedThisRound: boolean;
}

export interface CircleData {
  address: Address;
  token: Address;
  contributionAmount: bigint;
  maxMembers: bigint;
  memberCount: bigint;
  currentRound: bigint;
  potThisRound: bigint;
  contributedCount: bigint;
  topBid: bigint;
  topBidder: Address;
  completed: boolean;
  members: MemberRow[];
  /** First member in join order who has not received the pot yet. */
  nextTurnAddress: Address | null;
  /** True when the per-member contribution read completed without falling back. */
  contributionsFromLogs: boolean;
}

/** Read the member address out of a Contributed log without throwing. */
function logMember(log: { args?: unknown }): string | null {
  if (typeof log.args !== "object" || log.args === null) return null;
  const member = (log.args as { member?: unknown }).member;
  return typeof member === "string" ? member : null;
}

/**
 * The contract exposes no getter for "did this member pay this round", so the
 * fact is read from the Contributed event logs, filtered by the current round.
 */
const contributedEvent = savingsCircleAbi.find(
  (item) => item.type === "event" && item.name === "Contributed",
) as AbiEvent | undefined;

/** Widest eth_getLogs window the official Arbitrum Sepolia RPC accepts. */
const LOG_WINDOW = 9_000_000n;
/** Chunk size safe across all three configured providers. */
const LOG_CHUNK = 10_000n;

async function readContributedThisRound(
  address: Address,
  round: bigint,
  expected: number,
): Promise<{ found: Set<string>; fromLogs: boolean }> {
  const found = new Set<string>();
  if (!contributedEvent || expected === 0) {
    return { found, fromLogs: true };
  }

  const latest = await publicClient.getBlockNumber();
  const first = latest > LOG_WINDOW ? latest - LOG_WINDOW : 0n;

  try {
    const logs = await publicClient.getLogs({
      address,
      event: contributedEvent,
      args: { round },
      fromBlock: first,
      toBlock: latest,
    });
    for (const log of logs) {
      const member = logMember(log);
      if (member) found.add(member.toLowerCase());
    }
    return { found, fromLogs: true };
  } catch {
    // The provider rejected the wide range. Walk backwards in small chunks and
    // stop as soon as every expected payer has been seen.
    let high = latest;
    let guard = 0;
    while (high >= first && found.size < expected && guard < 400) {
      const low = high - LOG_CHUNK + 1n > first ? high - LOG_CHUNK + 1n : first;
      try {
        const logs = await publicClient.getLogs({
          address,
          event: contributedEvent,
          args: { round },
          fromBlock: low,
          toBlock: high,
        });
        for (const log of logs) {
          const member = logMember(log);
          if (member) found.add(member.toLowerCase());
        }
      } catch {
        // Skip a chunk that a provider refuses, keep scanning.
      }
      if (low === first) break;
      high = low - 1n;
      guard += 1;
    }
    return { found, fromLogs: false };
  }
}

/** Read the live state of a SavingsCircle from Arbitrum Sepolia. */
export async function loadCircle(input: string): Promise<CircleData> {
  if (!isAddress(input)) {
    throw new CircleError(
      "invalid-address",
      "That does not look like an address. A circle address is 42 characters and starts with 0x.",
    );
  }
  const address = input as Address;

  const bytecode = await publicClient.getBytecode({ address });
  if (!bytecode || bytecode === "0x") {
    throw new CircleError(
      "not-a-contract",
      `No contract is deployed at ${address} on Arbitrum Sepolia.`,
    );
  }

  let base;
  try {
    base = await publicClient.multicall({
      contracts: [
        { address, abi: savingsCircleAbi, functionName: "token" },
        { address, abi: savingsCircleAbi, functionName: "contributionAmount" },
        { address, abi: savingsCircleAbi, functionName: "maxMembers" },
        { address, abi: savingsCircleAbi, functionName: "memberCount" },
        { address, abi: savingsCircleAbi, functionName: "currentRound" },
        { address, abi: savingsCircleAbi, functionName: "potThisRound" },
        { address, abi: savingsCircleAbi, functionName: "contributedCount" },
        { address, abi: savingsCircleAbi, functionName: "topBid" },
        { address, abi: savingsCircleAbi, functionName: "topBidder" },
        { address, abi: savingsCircleAbi, functionName: "completed" },
        { address, abi: savingsCircleAbi, functionName: "members" },
      ],
      allowFailure: false,
    });
  } catch (cause) {
    throw new CircleError(
      "not-a-circle",
      `The contract at ${address} did not answer as a SavingsCircle.`,
      { cause },
    );
  }

  const [
    token,
    contributionAmount,
    maxMembers,
    memberCount,
    currentRound,
    potThisRound,
    contributedCount,
    topBid,
    topBidder,
    completed,
    membersRaw,
  ] = base;

  const members = (membersRaw as readonly Address[]) ?? [];

  let perMember: readonly (boolean | bigint)[] = [];
  if (members.length > 0) {
    const contracts = members.flatMap((member) => [
      {
        address,
        abi: savingsCircleAbi,
        functionName: "hasReceived" as const,
        args: [member] as const,
      },
      {
        address,
        abi: savingsCircleAbi,
        functionName: "claimable" as const,
        args: [member] as const,
      },
    ]);
    perMember = await publicClient.multicall({
      contracts,
      allowFailure: false,
    });
  }

  const { found, fromLogs } = await readContributedThisRound(
    address,
    currentRound,
    Number(contributedCount),
  );

  const rows: MemberRow[] = members.map((member, index) => ({
    address: member,
    index,
    hasReceived: Boolean(perMember[index * 2]),
    claimable: (perMember[index * 2 + 1] as bigint | undefined) ?? 0n,
    contributedThisRound: found.has(member.toLowerCase()),
  }));

  const nextTurn = rows.find((row) => !row.hasReceived) ?? null;

  return {
    address,
    token,
    contributionAmount,
    maxMembers,
    memberCount,
    currentRound,
    potThisRound,
    contributedCount,
    topBid,
    topBidder,
    completed,
    members: rows,
    nextTurnAddress: nextTurn ? nextTurn.address : null,
    contributionsFromLogs: fromLogs,
  };
}
