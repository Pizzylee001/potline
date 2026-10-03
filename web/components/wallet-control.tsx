"use client";

import { useState } from "react";
import { useAccount, useConnect, useDisconnect, useSwitchChain } from "wagmi";
import { ArrowsLeftRight, CaretDown, Copy, SignOut, Spinner } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CHAIN_ID, CHAIN_NAME } from "@/lib/chain";
import { truncateAddress } from "@/lib/format";

function errorMessage(error: unknown): string | null {
  if (!error) return null;
  const message = error instanceof Error ? error.message : String(error);
  if (message.toLowerCase().includes("connector not found")) {
    return "No browser wallet was found.";
  }
  if (message.toLowerCase().includes("user rejected")) {
    return "The request was declined.";
  }
  return message.split("\n")[0];
}

export function WalletControl() {
  const { address, chainId, isConnected, status } = useAccount();
  const { connect, connectors, error: connectError, isPending: connectPending } =
    useConnect();
  const { disconnect, isPending: disconnectPending } = useDisconnect();
  const { switchChain, error: switchError, isPending: switchPending } =
    useSwitchChain();
  const [copied, setCopied] = useState(false);

  const busy = connectPending || status === "connecting";
  const wrongNetwork = isConnected && chainId !== CHAIN_ID;
  const connectMessage = errorMessage(connectError);
  const switchMessage = errorMessage(switchError);

  async function copyAddress() {
    if (!address) return;
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  if (!isConnected || !address) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="default"
          onClick={() => {
            const connector = connectors[0];
            if (connector) connect({ connector });
          }}
          disabled={busy || connectors.length === 0}
          aria-busy={busy}
        >
          {busy ? <Spinner data-icon aria-hidden /> : null}
          {busy ? "Connecting" : "Connect Wallet"}
        </Button>
        {connectMessage ? (
          <p role="alert" className="max-w-[18rem] text-small text-destructive">
            {connectMessage}
          </p>
        ) : null}
      </div>
    );
  }

  if (wrongNetwork) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <span className="hidden rounded-chip border border-hairline-strong px-3 py-2 font-mono text-small text-muted md:inline">
          {truncateAddress(address)}
        </span>
        <Button
          type="button"
          variant="default"
          onClick={() => switchChain({ chainId: CHAIN_ID })}
          disabled={switchPending}
          aria-busy={switchPending}
        >
          <ArrowsLeftRight data-icon aria-hidden />
          Switch to {CHAIN_NAME}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="iconSm"
          onClick={() => disconnect()}
          disabled={disconnectPending}
          aria-label="Disconnect wallet"
        >
          <SignOut data-icon aria-hidden />
        </Button>
        {switchMessage ? (
          <p role="alert" className="max-w-[18rem] text-small text-destructive">
            {switchMessage}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button type="button" variant="outline" className="rounded-chip font-mono">
            <span className="text-mint">{truncateAddress(address, 6, 4)}</span>
            <CaretDown data-icon aria-hidden />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel className="font-mono break-all">
            {address}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={copyAddress}>
            <Copy data-icon aria-hidden />
            {copied ? "Copied" : "Copy address"}
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() => disconnect()}
            disabled={disconnectPending}
            className="text-destructive focus-visible:text-destructive"
          >
            <SignOut data-icon aria-hidden />
            Disconnect
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <span className="sr-only">{connectedScreenReaderNote(chainId, status)}</span>
    </div>
  );
}

function connectedScreenReaderNote(chainId: number | undefined, status: string) {
  if (status === "reconnecting") return "Reconnecting";
  if (chainId !== CHAIN_ID) return `Connected to the wrong network`;
  return `Connected to ${CHAIN_NAME}`;
}
