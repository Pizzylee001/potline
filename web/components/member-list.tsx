import { Check, X } from "@phosphor-icons/react";
import type { MemberRow } from "@/lib/circle-data";
import { formatUsdg, sameAddress, truncateAddress } from "@/lib/format";

interface MemberListProps {
  members: MemberRow[];
  youAddress: string | null;
}

function PaidIcon() {
  return (
    <span
      aria-hidden
      className="flex size-5 items-center justify-center rounded-chip border border-mint/60 text-mint"
    >
      <Check className="size-3" weight="bold" />
    </span>
  );
}

function OpenIcon() {
  return (
    <span
      aria-hidden
      className="flex size-5 items-center justify-center rounded-chip border border-hairline-strong text-muted"
    >
      <X className="size-3" weight="bold" />
    </span>
  );
}

function ReceivedBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-chip border border-mint/60 px-2 py-1 font-mono text-label text-mint">
      <Check className="size-3" weight="bold" aria-hidden />
      received
    </span>
  );
}

function WaitingBadge({ text }: { text: string }) {
  return (
    <span className="inline-flex items-center rounded-chip border border-hairline-strong px-2 py-1 font-mono text-label text-muted">
      {text}
    </span>
  );
}

function YouBadge() {
  return (
    <span className="rounded-chip bg-brass px-2 py-1 font-mono text-label text-brass-ink">
      you
    </span>
  );
}

export function MemberList({ members, youAddress }: MemberListProps) {
  return (
    <div>
      <table className="hidden w-full border-collapse md:table">
        <caption className="sr-only">Members in join order</caption>
        <thead>
          <tr className="border-b border-hairline-strong text-left">
            <th scope="col" className="w-16 py-3 pr-6 font-mono text-label uppercase tracking-[0.14em] text-muted">No</th>
            <th scope="col" className="py-3 pr-6 font-mono text-label uppercase tracking-[0.14em] text-muted">Member</th>
            <th scope="col" className="w-32 py-3 pr-6 font-mono text-label uppercase tracking-[0.14em] text-muted">Paid</th>
            <th scope="col" className="w-36 py-3 pr-6 font-mono text-label uppercase tracking-[0.14em] text-muted">Received</th>
            <th scope="col" className="w-36 py-3 text-right font-mono text-label uppercase tracking-[0.14em] text-muted">Credit</th>
          </tr>
        </thead>
        <tbody>
          {members.map((member) => {
            const isYou = sameAddress(member.address, youAddress);
            return (
              <tr key={member.address} className="border-b border-hairline transition-[background-color] duration-[180ms] last:border-0 hover:bg-surface">
                <td className="py-3 pr-6">
                  <span className="figure font-mono text-body text-muted">{member.index + 1}</span>
                </td>
                <td className="py-3 pr-6">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="figure font-mono text-body text-text" title={member.address}>
                      {truncateAddress(member.address, 6, 4)}
                    </span>
                    {isYou ? <YouBadge /> : null}
                  </span>
                </td>
                <td className="py-3 pr-6">
                  <span className="sr-only">{member.contributedThisRound ? "Paid this round" : "Not paid this round"}</span>
                  {member.contributedThisRound ? <PaidIcon /> : <OpenIcon />}
                </td>
                <td className="py-3 pr-6">
                  {member.hasReceived ? <ReceivedBadge /> : <WaitingBadge text="waiting" />}
                </td>
                <td className="py-3 text-right">
                  <span className="figure font-mono text-body text-text">
                    {formatUsdg(member.claimable)}
                  </span>
                  <span className="font-mono text-small text-muted"> USDG</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <ul className="m-0 list-none p-0 md:hidden">
        {members.map((member) => {
          const isYou = sameAddress(member.address, youAddress);
          return (
            <li key={member.address} className="border-b border-hairline py-4 last:border-0">
              <p className="flex items-center justify-between gap-3">
                <span className="figure font-mono text-body text-muted">#{member.index + 1}</span>
                {isYou ? <YouBadge /> : null}
              </p>
              <p className="figure mt-1 font-mono text-body break-all text-text" title={member.address}>
                {member.address}
              </p>
              <dl className="m-0 mt-3 grid grid-cols-3 gap-2">
                <div>
                  <dt className="font-mono text-label uppercase tracking-[0.14em] text-muted">Paid</dt>
                  <dd className="mt-1 flex items-center gap-1.5 text-small text-text">
                    {member.contributedThisRound ? <PaidIcon /> : <OpenIcon />}
                    {member.contributedThisRound ? "Yes" : "No"}
                  </dd>
                </div>
                <div>
                  <dt className="font-mono text-label uppercase tracking-[0.14em] text-muted">Received</dt>
                  <dd className="mt-1 text-small text-text">
                    {member.hasReceived ? <ReceivedBadge /> : <WaitingBadge text="waiting" />}
                  </dd>
                </div>
                <div>
                  <dt className="font-mono text-label uppercase tracking-[0.14em] text-muted">Credit</dt>
                  <dd className="figure mt-1 font-mono text-small text-text">
                    {formatUsdg(member.claimable)} USDG
                  </dd>
                </div>
              </dl>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
