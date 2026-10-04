"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import type { Abi, Address, Hash } from "viem";
import { decodeCircleRevert, revertCopy } from "@/lib/circle-errors";
import { formatUsdg } from "@/lib/format";

/** The visible states one action row moves through. */
export type WritePhase =
  | "idle"
  | "preparing"
  | "signature"
  | "pending"
  | "success"
  | "error";

export interface CircleWriteResult {
  phase: WritePhase;
  hash: Hash | undefined;
  /** Copy for the aria-live region. Null when there is nothing to announce. */
  message: string | null;
  /** True while this row is mid flight, so only this row shows a spinner. */
  busy: boolean;
  /** Ask the wallet to sign. No-op when the row is disabled. */
  send: () => void;
  /** Return to idle and clear the hash and any revert. */
  reset: () => void;
}

/** Copy for failures that are not contract reverts. */
function plainErrorMessage(error: unknown): string {
  if (!error) return "The transaction failed.";
  const raw = error instanceof Error ? error.message : String(error);
  const lower = raw.toLowerCase();

  if (lower.includes("user rejected") || lower.includes("user denied")) {
    return "You declined the request in your wallet.";
  }
  if (lower.includes("insufficient funds")) {
    return "This wallet does not hold enough ETH to pay gas on Arbitrum Sepolia.";
  }
  return raw.split("\n")[0] || "The transaction failed.";
}

/** Turn any thrown or reported error into interface copy. */
function describeError(error: unknown): string {
  const revert = decodeCircleRevert(error);
  return revert ? revertCopy(revert) : plainErrorMessage(error);
}

export interface CircleWriteOptions {
  /** Human name of the action, used in the live region. */
  label: string;
  /** True when the row's button is allowed to fire. */
  enabled: boolean;
  abi: Abi;
  address: Address;
  functionName: string;
  args?: readonly unknown[];
  /** Amount this action moves, shown on success. Null when it moves none. */
  amount?: bigint | null;
  /** Query keys to invalidate once the receipt confirms. Memoize at the call site. */
  invalidateKeys: readonly (readonly unknown[])[];
}

/**
 * One write slot for one action row. Phase and message are derived from the
 * wagmi mutation and its receipt during render, so there is no local copy of the
 * chain to fall out of sync. A confirmed receipt invalidates the circle query so
 * the whole view re-reads the chain.
 */
export function useCircleWrite(options: CircleWriteOptions): CircleWriteResult {
  const { label, enabled, abi, address, functionName, args, amount, invalidateKeys } =
    options;

  const queryClient = useQueryClient();
  const [preparing, setPreparing] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const {
    writeContractAsync,
    data: hash,
    error: writeError,
    isPending: awaitingWallet,
    reset: resetWrite,
  } = useWriteContract();

  const receipt = useWaitForTransactionReceipt({ hash });

  const reset = useCallback(() => {
    resetWrite();
    setPreparing(false);
    setLocalError(null);
  }, [resetWrite]);

  const send = useCallback(() => {
    if (!enabled) return;

    setLocalError(null);
    setPreparing(true);

    writeContractAsync(
      {
        abi,
        address,
        functionName,
        args: args ? ([...args] as never) : undefined,
      } as never,
      {
        onSuccess: () => setPreparing(false),
        onError: (error) => {
          setPreparing(false);
          setLocalError(describeError(error));
        },
      },
    );
  }, [enabled, abi, address, functionName, args, writeContractAsync]);

  // Derived state machine: wallet prompt, then inclusion, then the receipt.
  const failure = localError ?? (writeError ? describeError(writeError) : null);

  let phase: WritePhase = "idle";
  if (failure || receipt.error) phase = "error";
  else if (receipt.isSuccess) phase = "success";
  else if (hash) phase = "pending";
  else if (awaitingWallet) phase = "signature";
  else if (preparing) phase = "preparing";

  const moved = amount !== null && amount !== undefined && amount > 0n;

  const message =
    failure ??
    (receipt.error ? describeError(receipt.error) : null) ??
    (phase === "success"
      ? moved
        ? `${label} confirmed. ${formatUsdg(amount as bigint)} USDG moved.`
        : `${label} confirmed.`
      : phase === "preparing"
        ? "Preparing the request."
        : phase === "signature"
          ? "Check your wallet and sign the request."
          : phase === "pending"
            ? "Waiting for the transaction to confirm."
            : null);

  // Only external work here: drop the cache once, per confirmed hash.
  const settledHash = receipt.isSuccess ? hash : undefined;
  const invalidated = useRef<Hash | undefined>(undefined);

  useEffect(() => {
    if (!settledHash || invalidated.current === settledHash) return;
    invalidated.current = settledHash;
    for (const key of invalidateKeys) {
      void queryClient.invalidateQueries({ queryKey: key });
    }
  }, [settledHash, invalidateKeys, queryClient]);

  const busy =
    phase === "preparing" || phase === "signature" || phase === "pending";

  return { phase, hash, message, busy, send, reset };
}
