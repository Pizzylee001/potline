"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAccount } from "wagmi";
import { erc20Abi, type Abi, type Address } from "viem";
import { ArrowSquareOut, Spinner } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { savingsCircleAbi } from "@/lib/abis/savings-circle";
import { loadCircleAccount, type CircleAccountState } from "@/lib/circle-account";
import {
  bidValidation,
  describeActions,
  type ActionAvailability,
  type ActionId,
} from "@/lib/circle-actions";
import { useCircleWrite } from "@/lib/use-circle-write";
import { CHAIN_ID, EXPLORER_URL, USDG } from "@/lib/chain";
import type { CircleData } from "@/lib/circle-data";
import { formatUsdg } from "@/lib/format";

const inputClass =
  "w-full rounded-control border border-hairline-strong bg-surface px-3 py-2 font-mono text-body text-text placeholder:text-muted focus-visible:border-brass focus-visible:outline-none";

/** The transaction link shown once a receipt confirms. */
function TxLink({ hash }: { hash: string }) {
  return (
    <a
      href={`${EXPLORER_URL}/tx/${hash}`}
      target="_blank"
      rel="noreferrer noopener"
      className="inline-flex items-center gap-1 font-mono text-small text-brass underline-offset-4 hover:underline"
    >
      View transaction
      <ArrowSquareOut data-icon aria-hidden />
    </a>
  );
}

/** One status line per action, announced politely. */
function Status({
  phase,
  message,
  hash,
}: {
  phase: ReturnType<typeof useCircleWrite>["phase"];
  message: string | null;
  hash: string | undefined;
}) {
  return (
    <p
      aria-live="polite"
      className={`mt-2 text-small ${
        phase === "error" ? "text-destructive" : phase === "success" ? "text-mint" : "text-muted"
      }`}
    >
      {message}
      {phase === "success" && hash ? (
        <>
          {" "}
          <TxLink hash={hash} />
        </>
      ) : null}
    </p>
  );
}

interface ActionRowProps {
  circle: CircleData;
  action: ActionAvailability;
  /** Keys to invalidate once this row's receipt confirms. */
  invalidateKeys: readonly (readonly unknown[])[];
  /** Extra control rendered above the button, used by the bid amount input. */
  children?: ReactNode;
  /** True when the extra control currently blocks the send. */
  blockedByInput?: boolean;
  /** Amount moved by this action, shown on success. */
  amount?: bigint | null;
  /** Write target. Defaults to the circle; the approve step targets the token. */
  target?: { abi: Abi; address: Address; functionName: string; args: readonly unknown[] };
}

/**
 * One action, always rendered. When it cannot run the button is disabled and the
 * reason sits under it as helper text, so the rule stays visible.
 */
function ActionRow({
  circle,
  action,
  invalidateKeys,
  children,
  blockedByInput = false,
  amount = null,
  target,
}: ActionRowProps) {
  const canSend = action.enabled && !blockedByInput;

  const write = useCircleWrite({
    label: action.label,
    enabled: canSend,
    abi: target?.abi ?? savingsCircleAbi,
    address: target?.address ?? circle.address,
    functionName: target?.functionName ?? action.id,
    args: target?.args ?? [],
    amount,
    invalidateKeys,
  });

  const busy = write.busy;
  const label =
    write.phase === "preparing"
      ? "Preparing"
      : write.phase === "signature"
        ? "Confirm in wallet"
        : write.phase === "pending"
          ? "Pending onchain"
          : action.label;

  return (
    <div className="border-b border-hairline py-4 first:pt-0 last:border-0 last:pb-0">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <p className="font-mono text-label uppercase tracking-[0.14em] text-text">
          {action.label}
        </p>
        {action.reason && !busy ? (
          <span className="rounded-chip border border-hairline-strong px-2 py-0.5 font-mono text-label text-muted">
            {action.reason}
          </span>
        ) : null}
      </div>
      <p className="mt-1 text-small text-muted">{action.description}</p>

      {children}

      <div className="mt-3">
        <Button
          type="button"
          variant={action.id === "bid" || action.id === "contribute" ? "default" : "outline"}
          size="default"
          className="w-full"
          onClick={write.send}
          disabled={!canSend || busy}
          aria-disabled={!canSend || busy}
          aria-busy={busy}
        >
          {busy ? <Spinner data-icon aria-hidden /> : null}
          {label}
        </Button>
      </div>

      <Status phase={write.phase} message={write.message} hash={write.hash} />
    </div>
  );
}

interface ActionsPanelProps {
  circle: CircleData;
}

/**
 * The third card on the circle view. It renders the writes the connected address
 * can take right now, each gated on real chain state, and explains every one it
 * cannot take yet.
 */
export function ActionsPanel({ circle }: ActionsPanelProps) {
  const { address: connected, isConnected, chainId } = useAccount();
  const you = isConnected && connected ? connected : null;
  const [bidInput, setBidInput] = useState("");

  const accountQuery = useQuery({
    queryKey: ["circle-account", circle.address, you],
    queryFn: () => loadCircleAccount(circle.address, circle.token, you as Address),
    enabled: !!you,
    staleTime: 15_000,
    retry: 1,
  });

  if (!you) {
    return (
      <section
        aria-labelledby="actions-heading"
        className="rounded-block border border-hairline-strong bg-surface p-5"
      >
        <h2 id="actions-heading" className="text-h2 font-bold tracking-[-0.01em] text-text">
          Actions
        </h2>
        <p className="mt-1 text-small text-muted">
          Connect your wallet to participate
        </p>
      </section>
    );
  }

  const account: CircleAccountState = accountQuery.data ?? {
    address: you as Address,
    isMember: false,
    hasReceived: false,
    claimable: 0n,
    claimablePayout: 0n,
    allowance: 0n,
  };
  const accountLoaded = accountQuery.isSuccess;

  const wrongNetwork = chainId !== CHAIN_ID;
  const actions = describeActions({ circle, account, accountLoaded });
  const byId = new Map<ActionId, ActionAvailability>(actions.map((a) => [a.id, a]));

  const invalidateKeys = [
    ["circle", circle.address],
    ["circle-account", circle.address, you],
  ] as const;

  const bid = byId.get("bid") as ActionAvailability;
  const bidCheck = bidInput.trim().length > 0 ? bidValidation(circle, bidInput) : null;

  return (
    <section
      aria-labelledby="actions-heading"
      className="rounded-block border border-hairline-strong bg-surface p-5"
    >
      <h2 id="actions-heading" className="text-h2 font-bold tracking-[-0.01em] text-text">
        Actions
      </h2>
      <p className="mt-1 mb-4 text-small text-muted">
        Everything you can do in this round, read from the chain.
      </p>

      {wrongNetwork ? (
        <p role="status" className="mb-4 text-small text-destructive">
          Switch to Arbitrum Sepolia in the header before sending a transaction.
        </p>
      ) : null}

      <ActionRow
        circle={circle}
        action={withNetwork(byId.get("join") as ActionAvailability, wrongNetwork)}
        invalidateKeys={invalidateKeys}
      />

      <ActionRow
        circle={circle}
        action={withNetwork(byId.get("approve") as ActionAvailability, wrongNetwork)}
        invalidateKeys={invalidateKeys}
        target={{
          abi: erc20Abi,
          address: circle.token,
          functionName: "approve",
          args: [circle.address, circle.contributionAmount],
        }}
      />

      <ActionRow
        circle={circle}
        action={withNetwork(byId.get("contribute") as ActionAvailability, wrongNetwork)}
        invalidateKeys={invalidateKeys}
        amount={circle.contributionAmount}
      />

      <ActionRow
        circle={circle}
        action={withNetwork(bid, wrongNetwork)}
        invalidateKeys={invalidateKeys}
        blockedByInput={!bidCheck || !bidCheck.ok}
        amount={bidCheck?.ok ? bidCheck.amount : null}
        target={
          bidCheck?.ok
            ? {
                abi: savingsCircleAbi,
                address: circle.address,
                functionName: "bid",
                args: [bidCheck.amount],
              }
            : undefined
        }
      >
        <div className="mt-3">
          <label
            htmlFor="bid-amount"
            className="block font-mono text-label uppercase tracking-[0.14em] text-muted"
          >
            Bid amount in {USDG.symbol}
          </label>
          <input
            id="bid-amount"
            type="text"
            inputMode="decimal"
            autoComplete="off"
            value={bidInput}
            onChange={(event) => setBidInput(event.target.value)}
            disabled={!bid.enabled || wrongNetwork}
            placeholder="0.00"
            className={`${inputClass} mt-1.5`}
          />
          <p className="mt-1.5 text-small text-muted">
            Beat {formatUsdg(circle.topBid)} {USDG.symbol}, at most{" "}
            {formatUsdg(circle.potThisRound)} {USDG.symbol}
          </p>
          {bidCheck && !bidCheck.ok ? (
            <p className="mt-1 text-small text-destructive">{bidCheck.message}</p>
          ) : null}
        </div>
      </ActionRow>

      <ActionRow
        circle={circle}
        action={withNetwork(byId.get("settleRound") as ActionAvailability, wrongNetwork)}
        invalidateKeys={invalidateKeys}
      />

      <ActionRow
        circle={circle}
        action={withNetwork(byId.get("claim") as ActionAvailability, wrongNetwork)}
        invalidateKeys={invalidateKeys}
        amount={account.claimablePayout}
      />

      <ActionRow
        circle={circle}
        action={withNetwork(
          byId.get("withdrawCredit") as ActionAvailability,
          wrongNetwork,
        )}
        invalidateKeys={invalidateKeys}
        amount={account.claimable}
      />
    </section>
  );
}

/** Block every row while the wallet sits on the wrong chain. */
function withNetwork(action: ActionAvailability, wrongNetwork: boolean): ActionAvailability {
  if (!wrongNetwork) return action;
  return {
    ...action,
    enabled: false,
    reason: "Wrong network",
  };
}
