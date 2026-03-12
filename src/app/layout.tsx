import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { ConnectWallet } from "@/components/ConnectWallet";
import Link from "next/link";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "Handshake - Trustless Group Buys",
  description: "Pool funds for group purchases with blockchain-based escrow",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gray-50`}
      >
        <Providers>
          <header className="bg-white border-b border-gray-200">
            <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between h-16 items-center">
                <Link href="/" className="text-xl font-bold text-gray-900">
                  Handshake
                </Link>
                <div className="flex items-center gap-4">
                  <Link
                    href="/campaigns/new"
                    className="text-sm text-gray-600 hover:text-gray-900"
                  >
                    Create Campaign
                  </Link>
                  <ConnectWallet />
                </div>
              </div>
            </nav>
          </header>
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}
