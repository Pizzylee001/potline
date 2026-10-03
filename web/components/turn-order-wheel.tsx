"use client";

import { Check } from "@phosphor-icons/react";
import { motion, useReducedMotion } from "motion/react";
import type { Address } from "viem";
import { EASE_IN_OUT } from "@/components/reveal";
import type { MemberRow } from "@/lib/circle-data";
import { formatUsdg, sameAddress, truncateAddress } from "@/lib/format";

const RING_RADIUS = 38;

interface TurnOrderWheelProps {
  members: MemberRow[];
  turnAddress: Address | null;
  youAddress: string | null;
  potThisRound: bigint;
  currentRound: bigint;
  completed: boolean;
}

type NodeState = "received" | "turn" | "waiting";

function nodeClasses(state: NodeState, isYou: boolean) {
  const base =
    "relative flex size-12 items-center justify-center rounded-chip font-mono text-h3 font-bold md:size-16 md:text-display";
  const stateClass =
    state === "turn"
      ? "bg-brass text-brass-ink border border-transparent shadow-[0_10px_30px_rgba(217,164,65,0.22)]"
      : state === "received"
        ? "bg-surface text-mint border border-mint/60"
        : "bg-surface-raised text-muted border border-hairline-strong";
  return [base, stateClass, isYou ? "ring-2 ring-brass ring-offset-2 ring-offset-ink" : ""]
    .filter(Boolean)
    .join(" ");
}

export function TurnOrderWheel({
  members,
  turnAddress,
  youAddress,
  potThisRound,
  currentRound,
  completed,
}: TurnOrderWheelProps) {
  const reduced = useReducedMotion();
  const count = members.length;

  if (count === 0) return null;

  return (
    <div className="@container relative mx-auto aspect-square w-full max-w-[520px]">
      <svg
        aria-hidden="true"
        viewBox="0 0 100 100"
        className="absolute inset-0 h-full w-full"
      >
        <circle
          cx="50"
          cy="50"
          r={RING_RADIUS}
          fill="none"
          stroke="var(--hairline-strong)"
          strokeWidth="0.35"
          strokeDasharray="1.4 2.4"
        />
      </svg>

      <ol className="absolute inset-0 m-0 list-none p-0">
        {members.map((member, index) => {
          const angle = (-90 + (index / count) * 360) * (Math.PI / 180);
          const x = 50 + RING_RADIUS * Math.cos(angle);
          const y = 50 + RING_RADIUS * Math.sin(angle);
          const state: NodeState = sameAddress(member.address, turnAddress)
            ? "turn"
            : member.hasReceived
              ? "received"
              : "waiting";
          const isYou = sameAddress(member.address, youAddress);

          return (
            <li
              key={member.address}
              className="absolute"
              style={{
                left: `${x}%`,
                top: `${y}%`,
                transform: "translate(-50%, -50%)",
              }}
            >
              <div className={nodeClasses(state, isYou)}>
                <motion.div
                  aria-hidden="true"
                  className="flex size-full items-center justify-center rounded-chip"
                  initial={reduced || state !== "turn" ? false : { scale: 0.9 }}
                  animate={
                    reduced || state !== "turn"
                      ? undefined
                      : { scale: [0.9, 1.05, 1] }
                  }
                  transition={{ duration: 0.7, delay: 0.35, ease: EASE_IN_OUT }}
                >
                  <span>{index + 1}</span>
                </motion.div>

                {member.hasReceived ? (
                  <span className="absolute -right-1 -bottom-1 flex size-5 items-center justify-center rounded-chip border border-mint bg-ink">
                    <Check className="size-3 text-mint" weight="bold" />
                  </span>
                ) : null}

                {isYou ? (
                  <span className="absolute -top-2 left-1/2 -translate-x-1/2 rounded-chip border border-brass bg-ink px-1.5 py-0.5 font-mono text-[9px] text-brass">
                    you
                  </span>
                ) : null}

                <span className="absolute top-full left-1/2 mt-1.5 -translate-x-1/2 whitespace-nowrap font-mono text-[10px] text-muted md:text-label">
                  {truncateAddress(member.address, 4, 4)}
                </span>
              </div>
            </li>
          );
        })}
      </ol>

      <div className="absolute inset-0 flex items-center justify-center">
        <div className="flex aspect-square w-[40%] flex-col items-center justify-center gap-1 rounded-chip border border-hairline-strong bg-surface-raised px-3 text-center shadow-[0_30px_60px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(236,236,239,0.12)]">
          <span className="figure font-mono text-[clamp(24px,9.5cqw,52px)] leading-none font-bold text-text">
            {formatUsdg(potThisRound)}
          </span>
          <span className="font-mono text-[clamp(11px,3.4cqw,15px)] text-brass">USDG</span>
          <span className="font-mono text-[clamp(9px,2.8cqw,13px)] text-muted">
            {completed ? "Circle completed" : `Round ${currentRound} pot`}
          </span>
        </div>
      </div>
    </div>
  );
}
