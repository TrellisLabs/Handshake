"use client";

import { ConnectButton } from "thirdweb/react";
import { client, baseSepolia } from "@/lib/thirdweb";
import { createWallet } from "thirdweb/wallets";

const wallets = [
  createWallet("io.metamask"),
  createWallet("com.coinbase.wallet"),
  createWallet("io.rabby"),
];

export function ConnectWallet() {
  return (
    <ConnectButton
      client={client}
      chain={baseSepolia}
      wallets={wallets}
      connectButton={{
        label: "Connect Wallet",
        className: "!bg-blue-600 !text-white !px-4 !py-2 !rounded-lg !text-sm !font-medium hover:!bg-blue-700",
      }}
      detailsButton={{
        className: "!bg-gray-100 !text-gray-900 !px-4 !py-2 !rounded-lg !text-sm",
      }}
    />
  );
}
