import { WalletControl } from "@/components/wallet-control";

export function SiteHeader() {
  return (
    <header className="relative z-20 border-b border-hairline bg-ink/70 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-[1312px] items-center justify-between gap-4 px-5 md:px-16">
        <span className="flex items-center gap-2">
          <span aria-hidden className="size-2.5 shrink-0 rounded-chip bg-brass" />
          <span className="text-h3 font-black tracking-[-0.025em] text-text">
            Potline
          </span>
        </span>
        <WalletControl />
      </div>
    </header>
  );
}

