/**
 * The designed ground: horizontal ledger rules every 32px at 9 percent, plus a
 * single brass radial glow behind the pot zone. Fixed and pointer-events-none so
 * it never moves with the page and never sits on a scrolling container.
 */
export function LedgerBackground() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0">
      <div className="bg-ledger-rules absolute inset-0" />
      <div className="pot-glow absolute inset-x-0 top-0 h-[70vh]" />
    </div>
  );
}
