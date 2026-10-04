import type { AbiEvent, Address, Hash } from "viem";
import { parseEventLogs } from "viem";
import { publicClient } from "./public-client";
import { potlineFactoryAbi } from "./abis/potline-factory";
import { savingsCircleAbi } from "./abis/savings-circle";
import { FACTORY_ADDRESS } from "./chain";

/**
 * Query key for the factory registry. Shared by every screen that lists circles
 * so a confirmed createCircle invalidates all of them at once.
 */
export const FACTORY_CIRCLES_KEY = ["factory-circles"] as const;

/** Query key for the per-circle summaries the receipts screen renders. */
export function circleSummariesKey(account: string | null) {
  return ["factory-circles", "summaries", account] as const;
}

export interface FactoryCircles {
  /** The value of circleCount(), straight from the factory. */
  count: bigint;
  /** The value of allCircles(), in creation order. */
  addresses: readonly Address[];
}

/** Read the factory registry in one multicall. */
export async function loadFactoryCircles(): Promise<FactoryCircles> {
  const [count, addresses] = (await publicClient.multicall({
    contracts: [
      { address: FACTORY_ADDRESS, abi: potlineFactoryAbi, functionName: "circleCount" },
      { address: FACTORY_ADDRESS, abi: potlineFactoryAbi, functionName: "allCircles" },
    ],
    allowFailure: false,
  })) as readonly unknown[];

  return {
    count: toBigInt(count),
    addresses: (addresses as readonly Address[]) ?? [],
  };
}

export interface CircleSummary {
  address: Address;
  contributionAmount: bigint;
  memberCount: bigint;
  maxMembers: bigint;
  currentRound: bigint;
  completed: boolean;
  /** isMember() for the connected address. False when no wallet is connected. */
  isMember: boolean;
}

/** Circles read per multicall. Each circle costs six calls, so ten is 60. */
const SUMMARY_CHUNK = 10;

function toBigInt(value: unknown): bigint {
  if (typeof value === "bigint") return value;
  if (typeof value === "number") return BigInt(value);
  if (typeof value === "string" && value.trim().length > 0) return BigInt(value);
  return 0n;
}

function toBool(value: unknown): boolean {
  return value === true || value === 1n || value === 1;
}
/** The six reads one circle needs, in the order the decoder expects. */
function summaryContracts(address: Address, account: Address | null) {
  return [
    { address, abi: savingsCircleAbi, functionName: "memberCount" as const },
    { address, abi: savingsCircleAbi, functionName: "contributionAmount" as const },
    { address, abi: savingsCircleAbi, functionName: "currentRound" as const },
    { address, abi: savingsCircleAbi, functionName: "completed" as const },
    { address, abi: savingsCircleAbi, functionName: "maxMembers" as const },
    {
      address,
      abi: savingsCircleAbi,
      functionName: "isMember" as const,
      args: [(account ?? "0x0000000000000000000000000000000000000000") as Address] as const,
    },
  ];
}

function decodeSummary(
  address: Address,
  account: Address | null,
  results: readonly unknown[],
): CircleSummary {
  return {
    address,
    memberCount: toBigInt(results[0]),
    contributionAmount: toBigInt(results[1]),
    currentRound: toBigInt(results[2]),
    completed: toBool(results[3]),
    maxMembers: toBigInt(results[4]),
    isMember: account ? toBool(results[5]) : false,
  };
}

/** Read one circle on its own, used when a shared chunk fails. */
async function loadOneSummary(
  address: Address,
  account: Address | null,
): Promise<CircleSummary> {
  const results = (await publicClient.multicall({
    contracts: summaryContracts(address, account),
    allowFailure: false,
  })) as readonly unknown[];

  return decodeSummary(address, account, results);
}
/**
 * Read memberCount, contributionAmount, currentRound, completed, maxMembers and
 * isMember for every circle the factory knows, chunked so a long list never asks
 * one RPC for an oversized batch. A chunk that fails is retried circle by circle
 * so a single unreadable circle does not blank the page.
 */
export async function loadCircleSummaries(
  addresses: readonly Address[],
  account: Address | null,
): Promise<CircleSummary[]> {
  const rows: CircleSummary[] = [];

  for (let start = 0; start < addresses.length; start += SUMMARY_CHUNK) {
    const chunk = addresses.slice(start, start + SUMMARY_CHUNK);

    try {
      const results = (await publicClient.multicall({
        contracts: chunk.flatMap((address) => summaryContracts(address, account)),
        allowFailure: false,
      })) as readonly unknown[];

      chunk.forEach((address, index) => {
        rows.push(
          decodeSummary(address, account, results.slice(index * 6, index * 6 + 6)),
        );
      });
    } catch {
      for (const address of chunk) {
        rows.push(await loadOneSummary(address, account));
      }
    }
  }

  return rows;
}

const circleCreatedEvent = potlineFactoryAbi.find(
  (item) => item.type === "event" && item.name === "CircleCreated",
) as AbiEvent | undefined;

/**
 * Resolve the circle a confirmed createCircle transaction deployed. The address
 * comes from the CircleCreated log in the receipt, never from a guess. When the
 * log cannot be decoded the fallback is a fresh allCircles() read, whose last
 * entry is the most recently created circle.
 */
export async function loadCreatedCircle(hash: Hash): Promise<Address | null> {
  const receipt = await publicClient.waitForTransactionReceipt({ hash });

  if (circleCreatedEvent) {
    const decoded = parseEventLogs({
      abi: [circleCreatedEvent],
      eventName: "CircleCreated",
      logs: receipt.logs,
      strict: false,
    }) as readonly { args?: Record<string, unknown> }[];

    const args = decoded[0]?.args;
    const circle = args?.circle;
    if (typeof circle === "string") return circle as Address;
  }

  const { addresses } = await loadFactoryCircles();
  return addresses.length > 0 ? addresses[addresses.length - 1] : null;
}