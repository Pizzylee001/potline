import type { Metadata } from "next";
import Link from "next/link";
import { LiveCircles } from "@/components/live-circles";
import { Reveal } from "@/components/reveal";
import { CHAIN_NAME, DEMO_CIRCLE, EXPLORER_URL, FACTORY_ADDRESS, USDG } from "@/lib/chain";

export const metadata: Metadata = {
  title: "Potline",
  description:
    "Group savings circles onchain. Everyone contributes the same amount each round, anyone can bid part of the pot to take it early, and the bid is shared back with the other members.",
};

/** The three rules of the instrument, in the order a saver meets them. */
const STEPS = [
  {
    title: "Everyone contributes the same amount each round",
    body: "Each member pays an identical amount per round, on a turn that rotates around the circle. The pot grows until the round is full.",
  },
  {
    title: "Anyone can bid part of the pot to take it early",
    body: "A member who has already paid this round can bid less than the full pot and take the difference now, ahead of their turn.",
  },
  {
    title: "The bid is shared back with the other members",
    body: "The gap between the bid and the pot is credited to the other members to withdraw. The turn then rotates until everyone has been paid.",
  },
] as const;

export default function HomePage() {
  return (
    <div className="mx-auto w-full max-w-[1312px] px-5 pt-12 pb-24 md:px-16 md:pt-16">
      <section aria-labelledby="hero-heading" className="border-b border-hairline pb-12">
        <Reveal>
          <p className="flex items-center gap-2">
            <span aria-hidden className="size-2.5 shrink-0 rounded-chip bg-brass" />
            <span className="text-h3 font-black tracking-[-0.025em] text-text">
              Potline
            </span>
          </p>
          <h1
            id="hero-heading"
            className="mt-6 max-w-[22ch] text-display font-black tracking-[-0.025em] text-text"
          >
            Group savings circles, onchain.
          </h1>
          <p className="mt-4 max-w-[62ch] text-body text-muted">
            Potline is a savings circle you can join with a wallet. A fixed group
            pays the same amount every round, the pot passes around, and anyone
            can take their share early by bidding part of it.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href="/create"
              className="inline-flex h-11 items-center justify-center rounded-control border border-transparent bg-brass px-5 text-body font-medium text-brass-ink underline-offset-4 hover:brightness-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass"
            >
              Create a circle
            </Link>
            <Link
              href={`/circle/${DEMO_CIRCLE}`}
              className="inline-flex h-11 items-center justify-center rounded-control border border-hairline-strong bg-transparent px-5 text-body font-medium text-text underline-offset-4 hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass"
            >
              View the demo circle
            </Link>
          </div>
        </Reveal>
      </section>

      <section aria-labelledby="how-heading" className="border-b border-hairline py-12">
        <Reveal delay={0.05}>
          <p className="font-mono text-label uppercase tracking-[0.14em] text-muted">
            How it works
          </p>
          <h2
            id="how-heading"
            className="mt-2 text-h2 font-bold tracking-[-0.01em] text-text"
          >
            Three steps, then the turn rotates
          </h2>
          <ol className="m-0 mt-8 grid list-none grid-cols-1 gap-8 p-0 md:grid-cols-3 md:gap-6">
            {STEPS.map((step, index) => (
              <li key={step.title} className="border-t border-hairline-strong pt-5">
                <p className="figure font-mono text-h3 font-bold text-brass">
                  {String(index + 1).padStart(2, "0")}
                </p>
                <h3 className="mt-3 text-body font-bold text-text">
                  {step.title}
                </h3>
                <p className="mt-2 text-small text-muted">{step.body}</p>
              </li>
            ))}
          </ol>
        </Reveal>
      </section>

      <section aria-labelledby="live-heading" className="border-b border-hairline py-12">
        <Reveal delay={0.05}>
          <p className="font-mono text-label uppercase tracking-[0.14em] text-muted">
            On chain now
          </p>
          <h2
            id="live-heading"
            className="mt-2 text-h2 font-bold tracking-[-0.01em] text-text"
          >
            Live circles
          </h2>
          <p className="mt-2 max-w-[62ch] text-body text-muted">
            Read from the factory on {CHAIN_NAME}. These are real deployed
            addresses, nothing here is a placeholder.
          </p>
          <div className="mt-6 max-w-[640px]">
            <LiveCircles />
          </div>
        </Reveal>
      </section>

      <section aria-labelledby="settlement-heading" className="pt-12">
        <Reveal delay={0.05}>
          <p className="font-mono text-label uppercase tracking-[0.14em] text-muted">
            Settlement
          </p>
          <h2
            id="settlement-heading"
            className="mt-2 text-h2 font-bold tracking-[-0.01em] text-text"
          >
            {USDG.symbol} on {CHAIN_NAME}
          </h2>
          <dl className="m-0 mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <dt className="font-mono text-label uppercase tracking-[0.14em] text-muted">
                Token
              </dt>
              <dd className="m-0 mt-1.5">
                <a
                  href={`${EXPLORER_URL}/address/${USDG.address}`}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="figure block font-mono text-small break-all text-brass underline-offset-4 hover:underline"
                >
                  {USDG.address}
                </a>
              </dd>
            </div>
            <div>
              <dt className="font-mono text-label uppercase tracking-[0.14em] text-muted">
                Factory
              </dt>
              <dd className="m-0 mt-1.5">
                <a
                  href={`${EXPLORER_URL}/address/${FACTORY_ADDRESS}`}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="figure block font-mono text-small break-all text-brass underline-offset-4 hover:underline"
                >
                  {FACTORY_ADDRESS}
                </a>
              </dd>
            </div>
          </dl>
          <p className="mt-6 max-w-[62ch] text-small text-muted">
            This is a testnet build. Every circle, contribution and payout here
            settles in test {USDG.symbol} on {CHAIN_NAME} and carries no real
            value.
          </p>
        </Reveal>
      </section>
    </div>
  );
}
