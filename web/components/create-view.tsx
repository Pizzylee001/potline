"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useAccount } from "wagmi";
import type { Hash } from "viem";
import { ArrowSquareOut, Spinner } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { FieldError, FieldLabel, inputClass } from "@/components/ui/field";
import { Reveal } from "@/components/reveal";
import { PRESETS, validateCreateForm } from "@/lib/create-form";
import { potlineFactoryAbi } from "@/lib/abis/potline-factory";
import {
  FACTORY_CIRCLES_KEY,
  circleSummariesKey,
  loadCreatedCircle,
} from "@/lib/factory-data";
import { useCircleWrite } from "@/lib/use-circle-write";
import { useUrlParam } from "@/lib/use-url-param";
import { CHAIN_ID, EXPLORER_URL, FACTORY_ADDRESS, USDG } from "@/lib/chain";
import { formatUsdg, truncateAddress } from "@/lib/format";

/** Shown once the receipt confirms and the new address is read back. */
function CreatedCircle({ address, hash }: { address: string; hash: Hash }) {
  return (
    <div className="mt-6 rounded-block border border-hairline-strong bg-surface p-5">
      <p className="font-mono text-label uppercase tracking-[0.14em] text-mint">
        Circle created
      </p>
      <p className="mt-2 text-body text-muted">
        The factory deployed a new circle. Its address came from the{" "}
        <span className="font-mono text-text">CircleCreated</span> event in your
        receipt.
      </p>
      <p
        className="figure mt-3 font-mono text-body break-all text-text"
        title={address}
      >
        {address}
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Link
          href={`/circle/${address}`}
          className="inline-flex h-10 items-center justify-center rounded-control border border-transparent bg-brass px-4 text-small font-medium text-brass-ink underline-offset-4 hover:brightness-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass"
        >
          View circle
        </Link>
        <a
          href={`${EXPLORER_URL}/address/${address}`}
          target="_blank"
          rel="noreferrer noopener"
          className="inline-flex items-center gap-1 font-mono text-small text-brass underline-offset-4 hover:underline"
        >
          View on Arbiscan
          <ArrowSquareOut data-icon aria-hidden />
        </a>
        <a
          href={`${EXPLORER_URL}/tx/${hash}`}
          target="_blank"
          rel="noreferrer noopener"
          className="inline-flex items-center gap-1 font-mono text-small text-muted underline-offset-4 hover:text-text hover:underline"
        >
          Transaction
          <ArrowSquareOut data-icon aria-hidden />
        </a>
      </div>
    </div>
  );
}

function MarginLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-mono text-label uppercase tracking-[0.14em] text-muted lg:pt-2">
      {children}
    </p>
  );
}

/**
 * The create form. Amount and cap live in the query string so a refresh keeps
 * them. The write goes to PotlineFactory.createCircle, and the address shown on
 * success is read back from the confirmed receipt, never composed locally.
 */
export function CreateView() {
  const { address: connected, chainId, isConnected } = useAccount();
  const [touched, setTouched] = useState({ amount: false, cap: false });

  const amountParam = useUrlParam("amount", "");
  const capParam = useUrlParam("cap", "");

  const values = useMemo(
    () => ({ amount: amountParam.value, cap: capParam.value }),
    [amountParam.value, capParam.value],
  );

  const check = validateCreateForm(values);
  const wrongNetwork = isConnected && chainId !== CHAIN_ID;
  const canSubmit = isConnected && !wrongNetwork && check.ok;

  const write = useCircleWrite({
    label: "Create circle",
    enabled: canSubmit,
    abi: potlineFactoryAbi,
    address: FACTORY_ADDRESS,
    functionName: "createCircle",
    args: check.ok ? [check.amount, check.cap] : [0n, 0n],
    invalidateKeys: [FACTORY_CIRCLES_KEY, circleSummariesKey(null)],
  });

  const hash = write.phase === "success" ? write.hash : undefined;

  const created = useQuery({
    queryKey: ["created-circle", hash],
    queryFn: () => loadCreatedCircle(hash as Hash),
    enabled: !!hash,
    staleTime: Number.POSITIVE_INFINITY,
    retry: 2,
  });

  const busy = write.busy;
  const submitLabel =
    write.phase === "preparing"
      ? "Preparing"
      : write.phase === "signature"
        ? "Confirm in wallet"
        : write.phase === "pending"
          ? "Pending onchain"
          : "Create circle";

  return (
    <div className="mx-auto w-full max-w-[1312px] px-5 pt-12 pb-24 md:px-16 md:pt-16">
      <Reveal>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[132px_minmax(0,1fr)] lg:gap-8">
          <MarginLabel>New circle</MarginLabel>
          <div>
            <h1 className="text-display font-black tracking-[-0.025em] text-text">
              Create a circle
            </h1>
            <p className="mt-2 max-w-[70ch] text-body text-muted">
              The factory deploys a new savings circle for {USDG.symbol} on
              Arbitrum Sepolia. Anyone can create one, there is no owner and no
              fee beyond gas. The settings below are fixed at deployment.
            </p>
          </div>
        </div>
      </Reveal>

      <div className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-[132px_minmax(0,1fr)] lg:gap-8">
        <div className="lg:pt-2">
          <MarginLabel>Settings</MarginLabel>
        </div>
        <Reveal delay={0.05}>
          <div className="rounded-block border border-hairline-strong bg-surface p-5 md:p-6">
            {!isConnected ? (
              <p role="status" className="text-body text-muted">
                Connect your wallet to create a circle. Use the Connect Wallet
                button in the header.
              </p>
            ) : null}

            {wrongNetwork ? (
              <p role="status" className="mt-3 text-small text-destructive">
                Switch to Arbitrum Sepolia in the header before creating a circle.
              </p>
            ) : null}

            <div className="mt-4 flex flex-wrap gap-2">
              {PRESETS.map((preset) => (
                <Button
                  key={preset.label}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    amountParam.set(preset.amount);
                    capParam.set(preset.cap);
                  }}
                >
                  {preset.label}
                </Button>
              ))}
            </div>

            <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div>
                <FieldLabel
                  htmlFor="create-amount"
                  hint={`Per member, per round, in ${USDG.symbol}. Up to ${USDG.decimals} decimals.`}
                >
                  Contribution amount
                </FieldLabel>
                <input
                  id="create-amount"
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  className={`${inputClass} mt-1.5`}
                  value={values.amount}
                  placeholder="50"
                  aria-invalid={touched.amount && !check.ok && check.amountError ? true : undefined}
                  aria-describedby={
                    touched.amount && !check.ok && check.amountError
                      ? "create-amount-error"
                      : undefined
                  }
                  onChange={(event) => amountParam.set(event.target.value)}
                  onBlur={() =>
                    setTouched((prev) => ({ ...prev, amount: true }))
                  }
                />
                <FieldError id="create-amount-error">
                  {touched.amount && !check.ok ? check.amountError : null}
                </FieldError>
              </div>

              <div>
                <FieldLabel
                  htmlFor="create-cap"
                  hint="Whole number of members, 1 to 50."
                >
                  Member cap
                </FieldLabel>
                <input
                  id="create-cap"
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  className={`${inputClass} mt-1.5`}
                  value={values.cap}
                  placeholder="4"
                  aria-invalid={touched.cap && !check.ok && check.capError ? true : undefined}
                  aria-describedby={
                    touched.cap && !check.ok && check.capError
                      ? "create-cap-error"
                      : undefined
                  }
                  onChange={(event) => capParam.set(event.target.value)}
                  onBlur={() => setTouched((prev) => ({ ...prev, cap: true }))}
                />
                <FieldError id="create-cap-error">
                  {touched.cap && !check.ok ? check.capError : null}
                </FieldError>
              </div>
            </div>

            {check.ok ? (
              <p className="mt-4 text-small text-muted">
                Each member pays{" "}
                <span className="figure font-mono text-text">
                  {formatUsdg(check.amount)} {USDG.symbol}
                </span>{" "}
                per round. The circle holds at most{" "}
                <span className="figure font-mono text-text">
                  {check.cap.toString()}
                </span>{" "}
                members.
              </p>
            ) : null}

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Button
                type="button"
                variant="default"
                size="lg"
                onClick={() => {
                  setTouched({ amount: true, cap: true });
                  write.send();
                }}
                disabled={!canSubmit || busy}
                aria-disabled={!canSubmit || busy}
                aria-busy={busy}
              >
                {busy ? <Spinner data-icon aria-hidden /> : null}
                {submitLabel}
              </Button>
              <Link
                href="/receipts"
                className="font-mono text-small text-muted underline-offset-4 hover:text-text hover:underline"
              >
                See every circle
              </Link>
            </div>

            <p
              aria-live="polite"
              className={`mt-3 text-small ${
                write.phase === "error"
                  ? "text-destructive"
                  : write.phase === "success"
                    ? "text-mint"
                    : "text-muted"
              }`}
            >
              {write.message}
            </p>

            {write.phase === "error" ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={write.reset}
              >
                Try again
              </Button>
            ) : null}
          </div>

          {hash && created.isError ? (
            <div className="mt-4 rounded-block border border-hairline-strong bg-surface p-5">
              <p className="font-mono text-label uppercase tracking-[0.14em] text-destructive">
                Address unreadable
              </p>
              <p className="mt-2 text-body text-muted">
                The transaction confirmed, but the new circle address could not
                be read back from the receipt. The factory on Arbiscan still has
                it.
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <Button
                  type="button"
                  variant="default"
                  onClick={() => created.refetch()}
                >
                  Retry
                </Button>
                <a
                  href={`${EXPLORER_URL}/address/${FACTORY_ADDRESS}`}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="inline-flex items-center gap-1 font-mono text-small text-brass underline-offset-4 hover:underline"
                >
                  Open the factory on Arbiscan
                  <ArrowSquareOut data-icon aria-hidden />
                </a>
              </div>
            </div>
          ) : null}

          {created.data ? (
            <CreatedCircle address={created.data} hash={hash as Hash} />
          ) : null}

          <p className="mt-6 font-mono text-small break-all text-muted">
            Factory{" "}
            <a
              href={`${EXPLORER_URL}/address/${FACTORY_ADDRESS}`}
              target="_blank"
              rel="noreferrer noopener"
              className="text-muted underline-offset-4 hover:text-text hover:underline"
              title={FACTORY_ADDRESS}
            >
              {truncateAddress(FACTORY_ADDRESS, 10, 6)}
            </a>
          </p>
        </Reveal>
      </div>
    </div>
  );
}
