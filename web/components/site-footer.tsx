import { CHAIN_NAME, EXPLORER_URL, FACTORY_ADDRESS, USDG } from "@/lib/chain";
import { truncateAddress } from "@/lib/format";

export function SiteFooter() {
  return (
    <footer className="relative z-20 border-t border-hairline">
      <div className="mx-auto flex w-full max-w-[1312px] flex-col gap-3 px-5 py-6 md:flex-row md:items-center md:justify-between md:px-16">
        <p className="font-mono text-label uppercase tracking-[0.14em] text-muted">
          Potline / {CHAIN_NAME}
        </p>
        <p className="font-mono text-small text-muted">
          <a
            className="rounded-control underline-offset-4 outline-none hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass"
            href={`${EXPLORER_URL}/address/${USDG.address}`}
            target="_blank"
            rel="noreferrer"
          >
            {truncateAddress(USDG.address, 6, 4)}
          </a>
          {" is USDG. Factory is "}
          <a
            className="rounded-control underline-offset-4 outline-none hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass"
            href={`${EXPLORER_URL}/address/${FACTORY_ADDRESS}`}
            target="_blank"
            rel="noreferrer"
          >
            {truncateAddress(FACTORY_ADDRESS, 6, 4)}
          </a>
          {". Read only."}
        </p>
      </div>
    </footer>
  );
}
