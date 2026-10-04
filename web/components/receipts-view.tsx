"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useAccount } from "wagmi";
import type { Address } from "viem";
import { ArrowSquareOut } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/reveal";
import {
  FACTORY_CIRCLES_KEY,
  circleSummariesKey,
  loadCircleSummaries,
  loadFactoryCircles,
  type CircleSummary,
} from "@/lib/factory-data";
import { USDG } from "@/lib/chain";
import { formatUsdg, truncateAddress } from "@/lib/format";

/** Circles per page. The list is paged so a long registry stays readable. */
const PAGE_SIZE = 10;

const pulse = "animate-pulse bg-surface-raised motion-reduce:animate-none";

function MarginLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-mono text-label uppercase tracking-[0.14em] text-muted lg:pt-2">
      {children}
    </p>
  );
}

/** Loading state. Placeholders follow the loaded layout, without fake data. */
function ReceiptsSkeleton() {
  return (
    <div
      role="status"
      aria-label="Loading circles"
      className="rounded-block border border-hairline-strong bg-surface p-5"
    >
      <div aria-hidden className={`h-5 w-40 ${pulse}`} />
      <div aria-hidden className="mt-4 flex flex-col gap-3">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className={`h-10 w-full ${pulse}`} />
        ))}
      </div>
    </div>
  );
}

/** Plain yes or no, so the state is never left to the reader to infer. */
function YesNo({ value }: { value: boolean }) {
  return (
    <span className={value ? "text-mint" : "text-muted"}>{value ? "Yes" : "No"}</span>
  );
}

/** One circle row. Every figure comes from the chain reads above it. */
function SummaryRow({ row }: { row: CircleSummary }) {
  return (
    <tr className="border-b border-hairline transition-[background-color] duration-[180ms] last:border-0 hover:bg-surface">
      <td className="py-3 pr-6 align-top">
        <Link
          href={`/circle/${row.address}`}
          className="figure font-mono text-body text-brass underline-offset-4 hover:underline"
          title={row.address}
        >
          {truncateAddress(row.address, 8, 6)}
        </Link>
      </td>
      <td className="py-3 pr-6 align-top">
        <span className="figure font-mono text-body text-text">
          {formatUsdg(row.contributionAmount)}
        </span>
        <span className="font-mono text-small text-muted"> {USDG.symbol}</span>
      </td>
      <td className="figure py-3 pr-6 align-top font-mono text-body text-text">
        {row.currentRound.toString()}
      </td>
      <td className="figure py-3 pr-6 align-top font-mono text-body text-text">
        {row.memberCount.toString()}
        <span className="text-muted"> / {row.maxMembers.toString()}</span>
      </td>
      <td className="py-3 pr-6 align-top text-body">
        <YesNo value={row.isMember} />
      </td>
      <td className="py-3 pr-6 align-top text-body">
        <YesNo value={row.completed} />
      </td>
      <td className="py-3 text-right align-top">
        <Link
          href={`/circle/${row.address}`}
          className="inline-flex items-center gap-1 font-mono text-small text-text underline-offset-4 hover:text-brass hover:underline"
        >
          {row.isMember ? "Open circle" : "Join on circle page"}
          <ArrowSquareOut data-icon aria-hidden />
        </Link>
      </td>
    </tr>
  );
}

/** Mobile card form of the same row, so 375 never needs a horizontal scroll. */
function SummaryCard({ row }: { row: CircleSummary }) {
  return (
    <li className="border-b border-hairline py-4 last:border-0">
      <p className="figure font-mono text-body break-all text-brass">
        <Link
          href={`/circle/${row.address}`}
          className="underline-offset-4 hover:underline"
        >
          {row.address}
        </Link>
      </p>
      <dl className="m-0 mt-3 grid grid-cols-2 gap-3">
        <div>
          <dt className="font-mono text-label uppercase tracking-[0.14em] text-muted">
            Contribution
          </dt>
          <dd className="figure mt-1 font-mono text-small text-text">
            {formatUsdg(row.contributionAmount)} {USDG.symbol}
          </dd>
        </div>
        <div>
          <dt className="font-mono text-label uppercase tracking-[0.14em] text-muted">
            Round
          </dt>
          <dd className="figure mt-1 font-mono text-small text-text">
            {row.currentRound.toString()}
          </dd>
        </div>
        <div>
          <dt className="font-mono text-label uppercase tracking-[0.14em] text-muted">
            Members
          </dt>
          <dd className="figure mt-1 font-mono text-small text-text">
            {row.memberCount.toString()} of {row.maxMembers.toString()}
          </dd>
        </div>
        <div>
          <dt className="font-mono text-label uppercase tracking-[0.14em] text-muted">
            You are a member
          </dt>
          <dd className="mt-1 text-small">
            <YesNo value={row.isMember} />
          </dd>
        </div>
        <div>
          <dt className="font-mono text-label uppercase tracking-[0.14em] text-muted">
            Completed
          </dt>
          <dd className="mt-1 text-small">
            <YesNo value={row.completed} />
          </dd>
        </div>
      </dl>
      <Link
        href={`/circle/${row.address}`}
        className="mt-3 inline-flex items-center gap-1 font-mono text-small text-text underline-offset-4 hover:text-brass hover:underline"
      >
        {row.isMember ? "Open circle" : "Join on circle page"}
        <ArrowSquareOut data-icon aria-hidden />
      </Link>
    </li>
  );
}

/**
 * Read-only registry. Needs a connected wallet because membership is per
 * address. The registry and the per-circle reads are two queries so the list can
 * render its addresses before the heavier summary pass lands.
 */
export function ReceiptsView() {
  const { address: connected, isConnected } = useAccount();
  const you = (isConnected && connected ? connected : null) as Address | null;
  const [page, setPage] = useState(0);

  const registry = useQuery({
    queryKey: FACTORY_CIRCLES_KEY,
    queryFn: loadFactoryCircles,
    staleTime: 15_000,
    retry: 1,
  });

  const addresses = useMemo(() => registry.data?.addresses ?? [], [registry.data]);
  const total = addresses.length;

  const summaries = useQuery({
    queryKey: circleSummariesKey(you),
    queryFn: () => loadCircleSummaries(addresses, you),
    enabled: registry.isSuccess && total > 0,
    staleTime: 15_000,
    retry: 1,
  });
const rows = useMemo(() => summaries.data ?? [], [summaries.data]);
  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const visible = rows.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);
  const members = rows.filter((row) => row.isMember).length;

  const loading =
    registry.isPending ||
    (registry.isSuccess && total > 0 && summaries.isPending);
  const failed = registry.isError || summaries.isError;
  const error = registry.error ?? summaries.error;

  return (
    <div className="mx-auto w-full max-w-[1312px] px-5 pt-12 pb-24 md:px-16 md:pt-16">
      <Reveal>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[132px_minmax(0,1fr)] lg:gap-8">
          <MarginLabel>Registry</MarginLabel>
          <div>
            <h1 className="text-display font-black tracking-[-0.025em] text-text">
              Receipts
            </h1>
            <p className="mt-2 max-w-[70ch] text-body text-muted">
              Every circle the factory has deployed on Arbitrum Sepolia, read live
              from the chain. This screen only reads. It never moves money.
            </p>
          </div>
        </div>
      </Reveal>

      <div className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-[132px_minmax(0,1fr)] lg:gap-8">
        <div className="lg:pt-2">
          <MarginLabel>Circles</MarginLabel>
        </div>
        <Reveal delay={0.05}>
          {!you ? (
            <div className="rounded-block border border-hairline-strong bg-surface p-5">
              <p className="font-mono text-label uppercase tracking-[0.14em] text-muted">
                Wallet needed
              </p>
              <p className="mt-2 text-body text-muted">
                Connect your wallet to see which circles you belong to. Use the
                Connect Wallet button in the header.
              </p>
            </div>
          ) : null}

          {you && loading ? <ReceiptsSkeleton /> : null}

          {you && failed ? (
            <div className="rounded-block border border-hairline-strong bg-surface p-5">
              <p className="font-mono text-label uppercase tracking-[0.14em] text-destructive">
                Load failed
              </p>
              <p className="mt-2 text-body text-muted">
                {error instanceof Error
                  ? error.message
                  : "The chain could not be reached. The RPC endpoints may be busy."}
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <Button
                  type="button"
                  variant="default"
                  onClick={() => {
                    void registry.refetch();
                    void summaries.refetch();
                  }}
                >
                  Retry
                </Button>
                <p className="font-mono text-small text-muted">
                  Reading Arbitrum Sepolia over a fallback RPC.
                </p>
              </div>
            </div>
          ) : null}

          {you && !loading && !failed && total === 0 ? (
            <div className="rounded-block border border-dashed border-hairline-strong p-6 md:p-8">
              <p className="font-mono text-label uppercase tracking-[0.14em] text-muted">
                No circles yet
              </p>
              <h2 className="mt-2 text-h2 font-bold tracking-[-0.01em] text-text">
                No savings circles exist yet
              </h2>
              <p className="mt-2 max-w-[60ch] text-body text-muted">
                The factory has deployed nothing on Arbitrum Sepolia yet, so
                there is nothing to read. Create the first circle and it will
                appear here the moment the transaction confirms.
              </p>
              <div className="mt-6">
                <Link
                  href="/create"
                  className="inline-flex h-10 items-center justify-center rounded-control border border-transparent bg-brass px-4 text-small font-medium text-brass-ink underline-offset-4 hover:brightness-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass"
                >
                  Create a circle
                </Link>
              </div>
            </div>
          ) : null}

          {you && !loading && !failed && total > 0 && summaries.isSuccess ? (
            <div>
              <div className="rounded-block border border-hairline-strong bg-surface p-5">
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <p className="font-mono text-label uppercase tracking-[0.14em] text-text">
                    {total.toString()} circle{total === 1 ? "" : "s"} on chain
                  </p>
                  <p className="font-mono text-small text-muted">
                    <span className="figure text-text">{members.toString()}</span>{" "}
                    {members === 1 ? "circle" : "circles"} include you
                  </p>
                </div>

                <div className="mt-4">
                  <table className="hidden w-full border-collapse md:table">
                    <caption className="sr-only">
                      Circles deployed by the Potline factory, read from Arbitrum
                      Sepolia
                    </caption>
                    <thead>
                      <tr className="border-b border-hairline-strong text-left">
                        <th scope="col" className="py-3 pr-6 font-mono text-label uppercase tracking-[0.14em] text-muted">Circle</th>
                        <th scope="col" className="py-3 pr-6 font-mono text-label uppercase tracking-[0.14em] text-muted">Contribution</th>
                        <th scope="col" className="py-3 pr-6 font-mono text-label uppercase tracking-[0.14em] text-muted">Round</th>
                        <th scope="col" className="py-3 pr-6 font-mono text-label uppercase tracking-[0.14em] text-muted">Members</th>
                        <th scope="col" className="py-3 pr-6 font-mono text-label uppercase tracking-[0.14em] text-muted">You joined</th>
                        <th scope="col" className="py-3 pr-6 font-mono text-label uppercase tracking-[0.14em] text-muted">Completed</th>
                        <th scope="col" className="py-3 text-right font-mono text-label uppercase tracking-[0.14em] text-muted">Open</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visible.map((row) => (
                        <SummaryRow key={row.address} row={row} />
                      ))}
                    </tbody>
                  </table>

                  <ul className="m-0 list-none p-0 md:hidden">
                    {visible.map((row) => (
                      <SummaryCard key={row.address} row={row} />
                    ))}
                  </ul>
                </div>

                {pageCount > 1 ? (
                  <nav
                    aria-label="Circle pages"
                    className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-hairline pt-4"
                  >
                    <p className="figure font-mono text-small text-muted">
                      Page {safePage + 1} of {pageCount}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setPage((p) => Math.max(0, p - 1))}
                        disabled={safePage === 0}
                        aria-disabled={safePage === 0}
                      >
                        Previous
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setPage((p) => Math.min(pageCount - 1, p + 1))
                        }
                        disabled={safePage >= pageCount - 1}
                        aria-disabled={safePage >= pageCount - 1}
                      >
                        Next
                      </Button>
                    </div>
                  </nav>
                ) : null}
              </div>

              {members === 0 ? (
                <p className="mt-4 text-small text-muted">
                  This wallet is not a member of any circle yet. Open a circle and
                  use Join to become one.
                </p>
              ) : null}

              <p className="mt-6 text-small text-muted" aria-live="polite">
                {summaries.isFetching ? "Refreshing from the chain." : null}
              </p>
            </div>
          ) : null}
        </Reveal>
      </div>
    </div>
  );
}
