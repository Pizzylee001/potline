"use client";

import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { FACTORY_CIRCLES_KEY, loadFactoryCircles } from "@/lib/factory-data";

/** How many real circle addresses the landing page lists inline. */
const SHOWN = 6;

/**
 * The live circle list on the landing page. Reads the factory registry through
 * the same loader the receipts screen uses. It never invents an address, and
 * when the count is zero it says so and points at the create route.
 */
export function LiveCircles() {
  const registry = useQuery({
    queryKey: FACTORY_CIRCLES_KEY,
    queryFn: loadFactoryCircles,
    staleTime: 15_000,
    retry: 1,
  });

  const addresses = registry.data?.addresses ?? [];
  const total = registry.data ? Number(registry.data.count) : null;
  const shown = addresses.slice(0, SHOWN);
  const rest = Math.max(0, addresses.length - shown.length);

  return (
    <div className="rounded-block border border-hairline-strong bg-surface p-5 md:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p className="font-mono text-label uppercase tracking-[0.14em] text-text">
          Live circles
        </p>
        {registry.isFetching ? (
          <p className="figure font-mono text-small text-muted">Refreshing</p>
        ) : null}
      </div>

      {registry.isPending ? (
        <div
          role="status"
          aria-label="Loading circles"
          className="mt-4 flex flex-col gap-3"
        >
          <div
            aria-hidden
            className="h-4 w-56 animate-pulse bg-surface-raised motion-reduce:animate-none"
          />
          <div
            aria-hidden
            className="h-4 w-64 animate-pulse bg-surface-raised motion-reduce:animate-none"
          />
        </div>
      ) : null}

      {registry.isError ? (
        <div className="mt-4">
          <p className="text-body text-muted">
            The factory could not be read right now. The RPC endpoints may be
            busy.
          </p>
          <Button
            type="button"
            variant="default"
            size="sm"
            className="mt-4"
            onClick={() => registry.refetch()}
          >
            Retry
          </Button>
        </div>
      ) : null}

      {registry.isSuccess && addresses.length === 0 ? (
        <div className="mt-4">
          <p className="text-body text-muted">
            The factory has deployed no circles on Arbitrum Sepolia yet. Create
            the first one and it appears here as soon as the transaction
            confirms.
          </p>
          <a
            href="/create"
            className="mt-4 inline-flex h-9 items-center justify-center rounded-control border border-hairline-strong bg-transparent px-3 text-small font-medium text-text underline-offset-4 hover:bg-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass"
          >
            Create a circle
          </a>
        </div>
      ) : null}

      {registry.isSuccess && addresses.length > 0 ? (
        <div className="mt-4">
          <p className="text-body text-muted">
            <span className="figure font-mono text-text">
              {String(total)}
            </span>{" "}
            {total === 1 ? "circle has" : "circles have"} been deployed by the
            factory on Arbitrum Sepolia.
          </p>
          <ul className="m-0 mt-4 list-none p-0">
            {shown.map((address) => (
              <li
                key={address}
                className="border-b border-hairline py-3 last:border-0"
              >
                <a
                  href={`/circle/${address}`}
                  className="figure block font-mono text-small break-all text-brass underline-offset-4 hover:underline"
                >
                  {address}
                </a>
              </li>
            ))}
          </ul>
          {rest > 0 ? (
            <p className="mt-4 text-small text-muted">
              and {rest} more.{" "}
              <a
                href="/receipts"
                className="font-mono underline-offset-4 hover:text-text hover:underline"
              >
                See every circle
              </a>
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
