import { Button } from "@/components/ui/button";
import { CircleError } from "@/lib/circle-data";

const pulse =
  "animate-pulse bg-surface-raised motion-reduce:animate-none";

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-[1312px] px-5 pt-12 pb-24 md:px-16 md:pt-16">
      {children}
    </div>
  );
}

/** Loading state. Placeholders follow the loaded layout, without fake data. */
export function CircleSkeleton() {
  return (
    <Shell>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[132px_minmax(0,1fr)] lg:gap-8">
        <div aria-hidden className={`h-3 w-16 ${pulse}`} />
        <div className="flex flex-col gap-3">
          <div aria-hidden className={`h-9 w-56 ${pulse}`} />
          <div aria-hidden className={`h-4 w-full max-w-md ${pulse}`} />
        </div>
      </div>

      <div
        role="status"
        aria-label="Loading circle"
        className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-[132px_minmax(0,1fr)_420px] lg:gap-8"
      >
        <div aria-hidden className={`hidden h-3 w-16 lg:block ${pulse}`} />
        <div className="relative mx-auto aspect-square w-full max-w-[520px]">
          <div aria-hidden className="absolute inset-0 rounded-chip border border-dashed border-hairline-strong" />
          <div aria-hidden className={`absolute top-1/2 left-1/2 size-28 -translate-x-1/2 -translate-y-1/2 rounded-chip ${pulse}`} />
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              aria-hidden
              className={`absolute size-12 rounded-chip md:size-16 ${pulse}`}
              style={{
                left: `${[50, 86, 50, 14][i]}%`,
                top: `${[14, 50, 86, 50][i]}%`,
                transform: "translate(-50%, -50%)",
              }}
            />
          ))}
        </div>
        <div aria-hidden className="rounded-block border border-hairline-strong bg-surface p-5">
          <div className={`h-5 w-24 ${pulse}`} />
          <div className="mt-4 flex flex-col gap-3">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className={`h-4 w-full ${pulse}`} />
            ))}
          </div>
        </div>
      </div>

      <div aria-hidden className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-[132px_minmax(0,1fr)] lg:gap-8">
        <div className={`hidden h-3 w-16 lg:block ${pulse}`} />
        <div className="flex flex-col gap-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className={`h-10 w-full ${pulse}`} />
          ))}
        </div>
      </div>
    </Shell>
  );
}

/** A deployed circle that nobody has joined yet. Names the cause and the next action. */
export function CircleEmpty({ address }: { address: string }) {
  return (
    <Shell>
      <div className="rounded-block border border-dashed border-hairline-strong p-6 md:p-8">
        <p className="font-mono text-label uppercase tracking-[0.14em] text-muted">
          Empty circle
        </p>
        <h1 className="mt-2 text-h2 font-bold tracking-[-0.01em] text-text">
          No members yet
        </h1>
        <p className="mt-2 max-w-[60ch] text-body break-all text-muted">
          The circle at {address} is deployed on Arbitrum Sepolia, but no wallet
          has joined it. There is nothing to show until the first member joins.
        </p>
        <div className="mt-6">
          <Button type="button" variant="default" disabled aria-disabled="true">
            Create a circle
          </Button>
          <p className="mt-2 font-mono text-small text-muted">
            Joining and creating circles arrive in a later screen.
          </p>
        </div>
      </div>
    </Shell>
  );
}

/** The cause plus a retry. */
export function CircleLoadError({
  error,
  onRetry,
}: {
  error: unknown;
  onRetry: () => void;
}) {
  const message =
    error instanceof CircleError
      ? error.message
      : "The chain could not be reached. The RPC endpoints may be busy.";

  return (
    <Shell>
      <div className="rounded-block border border-hairline-strong bg-surface p-6 md:p-8">
        <p className="font-mono text-label uppercase tracking-[0.14em] text-destructive">
          Load failed
        </p>
        <h1 className="mt-2 text-h2 font-bold tracking-[-0.01em] text-text">
          Could not load this circle
        </h1>
        <p className="mt-2 max-w-[60ch] text-body text-muted">{message}</p>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Button type="button" variant="default" onClick={onRetry}>
            Retry
          </Button>
          <p className="font-mono text-small text-muted">
            Reading Arbitrum Sepolia over a fallback RPC.
          </p>
        </div>
      </div>
    </Shell>
  );
}
