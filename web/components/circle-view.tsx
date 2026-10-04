"use client";

import { useQuery } from "@tanstack/react-query";
import { useAccount } from "wagmi";
import type { Address } from "viem";
import { MemberList } from "@/components/member-list";
import { ActionsPanel } from "@/components/actions-panel";
import { PotPanel } from "@/components/pot-panel";
import { Reveal } from "@/components/reveal";
import { TurnOrderWheel } from "@/components/turn-order-wheel";
import { sameAddress } from "@/lib/format";
import { USDG } from "@/lib/chain";
import {
  CircleEmpty,
  CircleLoadError,
  CircleSkeleton,
} from "@/components/circle-states";
import { loadCircle } from "@/lib/circle-data";

const ZERO = "0x0000000000000000000000000000000000000000";

function MarginLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-mono text-label uppercase tracking-[0.14em] text-muted lg:pt-2">
      {children}
    </p>
  );
}

export function CircleView({ address }: { address: string }) {
  const { address: connectedAddress, isConnected } = useAccount();
  const query = useQuery({
    queryKey: ["circle", address],
    queryFn: () => loadCircle(address),
    staleTime: 15_000,
    retry: 1,
  });

  if (query.isPending) return <CircleSkeleton />;
  if (query.isError) {
    return (
      <CircleLoadError error={query.error} onRetry={() => query.refetch()} />
    );
  }

  const circle = query.data;
  if (circle.members.length === 0) {
    return <CircleEmpty address={circle.address} />;
  }

  const hasBid = circle.topBid > 0n && circle.topBidder !== ZERO;
  const turnAddress: Address | null = hasBid
    ? circle.topBidder
    : circle.nextTurnAddress;
  const turnMember = circle.members.find((m) =>
    sameAddress(m.address, turnAddress),
  );
  const youConnected = isConnected && !!connectedAddress ? connectedAddress : null;

  return (
    <div className="mx-auto w-full max-w-[1312px] px-5 pt-12 pb-24 md:px-16 md:pt-16">
      <Reveal>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[132px_minmax(0,1fr)] lg:gap-8">
          <MarginLabel>Circle</MarginLabel>
          <div>
            <h1 className="text-display font-black tracking-[-0.025em] text-text">
              Circle{" "}
              <span
                className="figure font-mono font-bold text-brass"
                title={circle.address}
              >
                {circle.address.slice(0, 8)}...{circle.address.slice(-6)}
              </span>
            </h1>
            <p className="mt-2 max-w-[70ch] text-body break-all text-muted">
              Savings circle on Arbitrum Sepolia, settled in {USDG.symbol} at{" "}
              <span className="figure font-mono">{circle.address}</span>. The
              page renders the full chain state with or without a connected
              wallet.
            </p>
          </div>
        </div>
      </Reveal>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-[132px_minmax(0,1fr)_300px] lg:gap-8 xl:grid-cols-[132px_minmax(0,1fr)_280px_300px]">
        <div className="lg:col-start-1 lg:row-start-1">
          <MarginLabel>Turn order</MarginLabel>
        </div>
        <Reveal delay={0.05} className="lg:col-start-2 lg:row-start-1">
          <TurnOrderWheel
            members={circle.members}
            turnAddress={turnAddress}
            youAddress={youConnected}
            potThisRound={circle.potThisRound}
            currentRound={circle.currentRound}
            completed={circle.completed}
          />
          <ul className="mx-auto mt-4 flex w-full max-w-[520px] list-none flex-wrap items-center justify-center gap-x-5 gap-y-2 p-0">
            <li className="flex items-center gap-2">
              <span aria-hidden className="size-2.5 rounded-chip bg-brass" />
              <span className="text-small text-muted">
                {turnMember
                  ? `Next: ${turnMember.address.slice(0, 6)}...${turnMember.address.slice(-4)}`
                  : "Next: none"}
              </span>
            </li>
            <li className="flex items-center gap-2">
              <span aria-hidden className="size-2.5 rounded-chip border-2 border-mint" />
              <span className="text-small text-muted">Received</span>
            </li>
            <li className="flex items-center gap-2">
              <span aria-hidden className="size-2.5 rounded-chip bg-surface-raised" />
              <span className="text-small text-muted">Waiting</span>
            </li>
          </ul>
        </Reveal>
        <Reveal delay={0.1} className="lg:col-start-3 lg:row-start-1">
          <PotPanel
            currentRound={circle.currentRound}
            maxMembers={circle.maxMembers}
            memberCount={circle.memberCount}
            potThisRound={circle.potThisRound}
            contributedCount={circle.contributedCount}
            topBid={circle.topBid}
            topBidder={circle.topBidder}
            completed={circle.completed}
            contributionAmount={circle.contributionAmount}
            youAddress={youConnected}
          />
          {query.isFetching ? (
            <p className="figure mt-3 text-right font-mono text-small text-muted">
              Refreshing
            </p>
          ) : null}
        </Reveal>
        <Reveal delay={0.15} className="lg:col-start-3 lg:row-start-2 xl:col-start-4 xl:row-start-1">
          <ActionsPanel circle={circle} />
        </Reveal>
      </div>

      <section
        aria-labelledby="members-heading"
        className="mt-12 grid grid-cols-1 gap-4 lg:grid-cols-[132px_minmax(0,1fr)] lg:gap-8"
      >
        <MarginLabel>Members</MarginLabel>
        <Reveal delay={0.05}>
          <div className="border-t border-hairline-strong pt-6">
            <h2
              id="members-heading"
              className="text-h2 font-bold tracking-[-0.01em] text-text"
            >
              Members
            </h2>
            <p className="mt-1 text-small text-muted">
              Join order. Paid and received come from the chain, credit is the
              claimable bid share.
            </p>
            <div className="mt-4">
              <MemberList members={circle.members} youAddress={youConnected} />
            </div>
          </div>
        </Reveal>
      </section>
    </div>
  );
}
