import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AppShell } from "@/components/app-shell";
import { WalletProvider } from "@/components/wallet-provider";
import { ToastProvider } from "@/components/toast";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Aegis Health | Patient-owned records",
  description:
    "Encrypted health records and consent controls secured by Stellar Soroban.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="min-h-screen bg-background font-sans text-ink antialiased">
        <WalletProvider>
          <ToastProvider>
            <AppShell>{children}</AppShell>
          </ToastProvider>
        </WalletProvider>
      </body>
    </html>
  );
}
