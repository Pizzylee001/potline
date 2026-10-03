import type { ReactNode } from "react";
import type { Address } from "viem";
import { sameAddress, truncateAddress, formatUsdg } from "@/lib/format";
import { USDG } from "@/lib/chain";

interface PotPanelProps {
  currentRound: bigint;
  maxMembers: bigint;
  memberCount: bigint;
  potThisRound: bigint;
  contributedCount: bigint;
  topBid: bigint;
  topBidder: Address;
  completed: boolean;
  contributionAmount: bigint;
  youAddress: string | null;
}

const ZERO = "0x0000000000000000000000000000000000000000";

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-hairline py-2.5 first:pt-0 last:border-0 last:pb-0">
      <dt className="shrink-0 font-mono text-label uppercase tracking-[0.14em] text-muted">
        {label}
      </dt>
      <dd className="text-right">{children}</dd>
    </div>
  );
}

function Amount({ value }: { value: bigint }) {
  return (
    <span className="figure font-mono text-body text-text">
      {formatUsdg(value)} <span className="text-muted">{USDG.symbol}</span>
    </span>
  );
}

export function PotPanel(props: PotPanelProps) {
  const {
    currentRound,
    maxMembers,
    memberCount,
    potThisRound,
    contributedCount,
    topBid,
    topBidder,
    completed,
    contributionAmount,
    youAddress,
  } = props;

  const hasBid = topBid > 0n && topBidder !== ZERO;
  const bidderIsYou = hasBid && sameAddress(topBidder, youAddress);

  return (
    <section
      aria-labelledby="pot-heading"
      className="rounded-block border border-hairline-strong bg-surface p-5"
    >
      <h2 id="pot-heading" className="text-h2 font-bold tracking-[-0.01em] text-text">
        Pot
      </h2>
      <p className="mt-1 mb-4 text-small text-muted">
        {completed
          ? "Every member has received. The circle is settled."
          : "Live round state, read from the chain."}
      </p>

      <dl className="m-0">
        <Row label="Round">
          <span className="figure font-mono text-body text-text">
            {completed ? `${memberCount} rounds` : `${currentRound} of ${memberCount}`}
          </span>
        </Row>
        <Row label="Pot this round">
          <Amount value={potThisRound} />
        </Row>
        <Row label="Contributed">
          <span className="figure font-mono text-body text-text">
            {contributedCount.toString()} of {memberCount.toString()}
          </span>
        </Row>
        <Row label="Top bid">
          {hasBid ? (
            <Amount value={topBid} />
          ) : (
            <span className="font-mono text-body text-muted">None</span>
          )}
        </Row>
        <Row label="Top bidder">
          {hasBid ? (
            <span className="figure font-mono text-body text-text" title={topBidder}>
              {truncateAddress(topBidder, 6, 4)}
              {bidderIsYou ? <span className="text-brass"> · you</span> : null}
            </span>
          ) : (
            <span className="font-mono text-body text-muted">No bids yet</span>
          )}
        </Row>
        <Row label="Contribution">
          <Amount value={contributionAmount} />
        </Row>
        <Row label="Member cap">
          <span className="figure font-mono text-body text-text">
            {maxMembers.toString()}
          </span>
        </Row>
      </dl>
    </section>
  );
}
