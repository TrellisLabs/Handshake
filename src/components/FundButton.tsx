"use client";

import { useState } from "react";
import { useActiveAccount, useSendTransaction } from "thirdweb/react";
import { prepareContractCall, getContract } from "thirdweb";
import { client, baseSepolia } from "@/lib/thirdweb";
import { USDC_ADDRESS, parseUSDC } from "@/lib/constants";
import { useRouter } from "next/navigation";

interface FundButtonProps {
  campaignId: string;
  safeAddress: string;
}

export function FundButton({ campaignId, safeAddress }: FundButtonProps) {
  const account = useActiveAccount();
  const router = useRouter();
  const { mutateAsync: sendTransaction, isPending } = useSendTransaction();

  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleFund = async () => {
    if (!account) {
      setError("Please connect your wallet");
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      setError("Please enter a valid amount");
      return;
    }

    if (!USDC_ADDRESS) {
      setError("USDC contract address not configured");
      return;
    }

    setError(null);
    setSuccess(false);

    try {
      const contract = getContract({
        client,
        chain: baseSepolia,
        address: USDC_ADDRESS,
      });

      const amountBigInt = parseUSDC(parseFloat(amount));

      const transaction = prepareContractCall({
        contract,
        method: "function transfer(address to, uint256 amount) returns (bool)",
        params: [safeAddress, amountBigInt],
      });

      await sendTransaction(transaction);

      await fetch(`/api/campaigns/${campaignId}/sync-balance`, {
        method: "POST",
      });

      setSuccess(true);
      setAmount("");
      router.refresh();
    } catch (err) {
      console.error("Funding error:", err);
      setError(err instanceof Error ? err.message : "Failed to send funds");
    }
  };

  if (!account) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <p className="text-gray-600 text-sm">
          Connect your wallet to fund this campaign.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-green-700 text-sm">
          Funds sent successfully! The balance will update shortly.
        </div>
      )}

      <div className="flex gap-3">
        <div className="flex-1">
          <label className="sr-only">Amount (USDC)</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
              $
            </span>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="100"
              min="0"
              step="0.01"
              className="w-full pl-7 pr-16 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
              USDC
            </span>
          </div>
        </div>
        <button
          onClick={handleFund}
          disabled={isPending || !amount}
          className="bg-green-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPending ? "Sending..." : "Fund"}
        </button>
      </div>

      <p className="text-xs text-gray-500">
        Funds are sent directly to the campaign&apos;s Safe wallet.
      </p>
    </div>
  );
}
