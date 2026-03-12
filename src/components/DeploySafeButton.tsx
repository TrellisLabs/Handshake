"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useActiveAccount, useSendTransaction } from "thirdweb/react";
import { prepareTransaction } from "thirdweb";
import { client, baseSepolia } from "@/lib/thirdweb";

interface DeploySafeButtonProps {
  campaignId: string;
  signers: string[];
}

export function DeploySafeButton({ campaignId, signers }: DeploySafeButtonProps) {
  const router = useRouter();
  const account = useActiveAccount();
  const { mutateAsync: sendTransaction, isPending: isSending } = useSendTransaction();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [predictedAddress, setPredictedAddress] = useState<string | null>(null);

  const handleDeploySafe = async () => {
    if (!account) {
      setError("Please connect your wallet first");
      return;
    }

    // Verify the connected wallet is one of the signers
    const isAuthorized = signers.some(
      (s) => s.toLowerCase() === account.address.toLowerCase()
    );
    if (!isAuthorized) {
      setError("Only campaign signers can deploy the Safe wallet");
      return;
    }

    setIsLoading(true);
    setError(null);
    setStatus("Preparing deployment transaction...");

    try {
      // Step 1: Get deployment transaction data from API
      const response = await fetch(`/api/campaigns/${campaignId}/deploy-safe`, {
        method: "POST",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to prepare deployment");
      }

      const { predictedAddress: addr, transaction } = await response.json();
      setPredictedAddress(addr);
      setStatus(`Deploying Safe to ${addr.slice(0, 10)}...`);

      // Step 2: Send the deployment transaction via thirdweb
      const tx = prepareTransaction({
        client,
        chain: baseSepolia,
        to: transaction.to,
        data: transaction.data,
        value: BigInt(transaction.value),
      });

      const result = await sendTransaction(tx);
      setStatus("Waiting for confirmation...");

      // Step 3: Wait for transaction to be mined
      // The transaction hash is available immediately
      const txHash = result.transactionHash;

      // Poll for deployment confirmation
      let confirmed = false;
      let attempts = 0;
      const maxAttempts = 30; // 30 seconds max

      while (!confirmed && attempts < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        attempts++;
        setStatus(`Confirming deployment... (${attempts}s)`);

        try {
          const confirmResponse = await fetch(
            `/api/campaigns/${campaignId}/deploy-safe`,
            {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ safeAddress: addr, txHash }),
            }
          );

          if (confirmResponse.ok) {
            confirmed = true;
            setStatus("Safe deployed successfully!");
            setTimeout(() => router.refresh(), 1000);
          }
        } catch {
          // Safe not deployed yet, continue polling
        }
      }

      if (!confirmed) {
        setStatus(null);
        setError(
          `Transaction submitted but Safe deployment not confirmed yet. ` +
          `Check BaseScan for tx: ${txHash.slice(0, 20)}... ` +
          `If successful, the Safe address will be: ${addr}`
        );
      }
    } catch (err) {
      console.error("Deploy error:", err);
      setError(err instanceof Error ? err.message : "Failed to deploy Safe");
      setStatus(null);
    } finally {
      setIsLoading(false);
    }
  };

  const isProcessing = isLoading || isSending;

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
          {error}
        </div>
      )}

      {status && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-blue-700 text-sm">
          {status}
        </div>
      )}

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-medium text-blue-900 mb-2">Safe Wallet Required</h3>
        <p className="text-blue-800 text-sm mb-4">
          This campaign needs a Safe wallet to receive and manage funds. Deploy one with the following configuration:
        </p>

        <div className="bg-white rounded p-3 mb-4 space-y-2">
          <p className="text-sm font-medium text-gray-700">Owners (all 3 required):</p>
          {signers.map((signer, i) => (
            <p key={i} className="text-xs font-mono text-gray-600 break-all">
              {i + 1}. {signer}
            </p>
          ))}
          <p className="text-sm font-medium text-gray-700 mt-3">Threshold: 2 of 3</p>
        </div>

        {predictedAddress && (
          <div className="bg-green-50 rounded p-3 mb-4">
            <p className="text-xs text-gray-500 mb-1">Predicted Safe Address:</p>
            <p className="text-sm font-mono text-gray-900 break-all">
              {predictedAddress}
            </p>
          </div>
        )}

        {!account ? (
          <p className="text-sm text-gray-600">
            Connect your wallet to deploy the Safe.
          </p>
        ) : (
          <button
            onClick={handleDeploySafe}
            disabled={isProcessing}
            className="w-full bg-blue-600 text-white px-4 py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isProcessing ? (
              <span className="flex items-center justify-center gap-2">
                <svg
                  className="animate-spin h-5 w-5"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Deploying...
              </span>
            ) : (
              "Deploy Safe Wallet"
            )}
          </button>
        )}
      </div>
    </div>
  );
}
