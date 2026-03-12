"use client";

import { useState, useEffect } from "react";
import { useActiveAccount } from "thirdweb/react";
import { useRouter } from "next/navigation";

interface SignTransactionButtonProps {
  milestoneId: string;
  safeTxHash: string;
  safeAddress: string;
  onSignComplete?: () => void;
}

interface SignatureStatus {
  confirmations: number;
  threshold: number;
  signers: string[];
  canExecute: boolean;
}

export function SignTransactionButton({
  milestoneId,
  safeTxHash,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  safeAddress,
  onSignComplete,
}: SignTransactionButtonProps) {
  const account = useActiveAccount();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<SignatureStatus | null>(null);

  // Fetch current signature status
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const response = await fetch(`/api/milestones/${milestoneId}/sign`);
        if (response.ok) {
          const data = await response.json();
          setStatus(data);
        }
      } catch (err) {
        console.error("Failed to fetch signature status:", err);
      }
    };

    fetchStatus();
    // Poll every 10 seconds
    const interval = setInterval(fetchStatus, 10000);
    return () => clearInterval(interval);
  }, [milestoneId]);

  const hasAlreadySigned = status?.signers.some(
    (s) => s.toLowerCase() === account?.address?.toLowerCase()
  );

  const handleSign = async () => {
    if (!account) {
      setError("Please connect your wallet");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Get the transaction data for signing
      const proposeResponse = await fetch(`/api/milestones/${milestoneId}/propose`);
      if (!proposeResponse.ok) {
        throw new Error("Failed to get transaction data");
      }

      // Sign the Safe transaction hash using EIP-191 personal_sign
      // Safe uses eth_sign style signatures (prefixed message)
      const signature = await account.signMessage({
        message: { raw: safeTxHash as `0x${string}` },
      });

      // Adjust signature for Safe (add 4 to v value for eth_sign)
      // Safe expects signatures with v = 31 or 32 for eth_sign
      const adjustedSignature = adjustSignatureForSafe(signature);

      // Submit signature to API
      const response = await fetch(`/api/milestones/${milestoneId}/sign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          safeTxHash,
          signature: adjustedSignature,
          signerAddress: account.address,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to submit signature");
      }

      const result = await response.json();
      setStatus({
        confirmations: result.confirmations,
        threshold: result.threshold,
        signers: [...(status?.signers || []), account.address],
        canExecute: result.confirmations >= result.threshold,
      });

      onSignComplete?.();
      router.refresh();
    } catch (err) {
      console.error("Sign error:", err);
      setError(err instanceof Error ? err.message : "Failed to sign transaction");
    } finally {
      setIsLoading(false);
    }
  };

  if (!status) {
    return (
      <div className="text-sm text-gray-500">Loading signature status...</div>
    );
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-2 text-red-700 text-sm">
          {error}
        </div>
      )}

      <div className="flex items-center gap-2">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-medium text-gray-700">
              Signatures: {status.confirmations}/{status.threshold}
            </span>
            {status.canExecute && (
              <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full">
                Ready to execute
              </span>
            )}
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${
                status.canExecute ? "bg-green-500" : "bg-blue-500"
              }`}
              style={{
                width: `${(status.confirmations / status.threshold) * 100}%`,
              }}
            />
          </div>
        </div>

        {!status.canExecute && !hasAlreadySigned && account && (
          <button
            onClick={handleSign}
            disabled={isLoading}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? "Signing..." : "Sign"}
          </button>
        )}

        {hasAlreadySigned && !status.canExecute && (
          <span className="text-sm text-green-600 font-medium">
            You signed
          </span>
        )}
      </div>

      {status.signers.length > 0 && (
        <div className="text-xs text-gray-500">
          Signed by:{" "}
          {status.signers.map((s, i) => (
            <span key={s}>
              {i > 0 && ", "}
              <span className="font-mono">{s.slice(0, 6)}...{s.slice(-4)}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// Adjust signature for Safe's eth_sign verification
// Safe adds 4 to v for eth_sign signatures to distinguish from EIP-712
function adjustSignatureForSafe(signature: string): string {
  const r = signature.slice(0, 66);
  const s = "0x" + signature.slice(66, 130);
  let v = parseInt(signature.slice(130, 132), 16);

  // Safe expects v to be 31 or 32 for eth_sign (adds 4 to standard 27/28)
  if (v < 30) {
    v += 4;
  }

  return r + s.slice(2) + v.toString(16).padStart(2, "0");
}
