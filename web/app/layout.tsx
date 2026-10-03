import type { Metadata, Viewport } from "next";
import { DM_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { LedgerBackground } from "@/components/ledger-background";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { Providers } from "./providers";

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "700", "900"],
  variable: "--font-sans",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Potline",
  description:
    "Onchain group savings circles that settle in USDG on Arbitrum Sepolia.",
};

export const viewport: Viewport = {
  colorScheme: "dark",
  themeColor: "#0a0c11",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${dmSans.variable} ${jetbrainsMono.variable}`}
    >
      <body className="min-h-dvh bg-ink text-text">
        <LedgerBackground />
        <Providers>
          <div className="relative z-10 flex min-h-dvh flex-col">
            <SiteHeader />
            <main className="flex-1">{children}</main>
            <SiteFooter />
          </div>
        </Providers>
      </body>
    </html>
  );
}
