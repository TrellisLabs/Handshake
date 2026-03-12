"use client";

import { useState } from "react";
import { useActiveAccount, useSendTransaction } from "thirdweb/react";
import { prepareTransaction } from "thirdweb";
import { formatUSDC } from "@/lib/constants";
import { useRouter } from "next/navigation";
import { SignTransactionButton } from "./SignTransactionButton";
import { client, baseSepolia } from "@/lib/thirdweb";

interface Milestone {
  id: string;
  title: string;
  description: string;
  releaseAmount: bigint;
  order: number;
  status: string;
  proofUrl: string | null;
  txHash: string | null;
  safeTxHash?: string | null;
  confirmations?: number;
}

interface MilestoneListProps {
  milestones: Milestone[];
  safeAddress: string | null;
  recipientAddress: string;
  creatorAddress: string;
  signers: string[];
}

export function MilestoneList({
  milestones,
  safeAddress,
  recipientAddress,
  creatorAddress,
  signers,
}: MilestoneListProps) {
  const account = useActiveAccount();
  const router = useRouter();
  const { mutateAsync: sendTransaction, isPending: isSending } = useSendTransaction();

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [proofUrl, setProofUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [executingId, setExecutingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isCreator = account?.address?.toLowerCase() === creatorAddress.toLowerCase();
  const isSigner = account?.address && signers.map(s => s.toLowerCase()).includes(account.address.toLowerCase());

  const handleSubmitMilestone = async (milestoneId: string) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/milestones/${milestoneId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proofUrl }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to submit milestone");
      }

      setProofUrl("");
      setExpandedId(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit milestone");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleProposePayout = async (milestoneId: string) => {
    if (!account) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/milestones/${milestoneId}/propose`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          signerAddress: account.address,
          safeAddress,
          recipientAddress,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to propose payout");
      }

      const result = await response.json();

      // Sign the transaction immediately after proposing
      if (result.safeTxHash) {
        try {
          const signature = await account.signMessage({
            message: { raw: result.safeTxHash as `0x${string}` },
          });

          const adjustedSignature = adjustSignatureForSafe(signature);

          await fetch(`/api/milestones/${milestoneId}/sign`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              safeTxHash: result.safeTxHash,
              signature: adjustedSignature,
              signerAddress: account.address,
            }),
          });
        } catch (signErr) {
          console.error("Failed to auto-sign after propose:", signErr);
        }
      }

      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to propose payout");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExecute = async (milestoneId: string) => {
    if (!account) return;

    setExecutingId(milestoneId);
    setError(null);

    try {
      // Get execution transaction data
      const response = await fetch(`/api/milestones/${milestoneId}/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signerAddress: account.address }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to prepare execution");
      }

      const { transaction } = await response.json();

      // Execute the transaction
      const tx = prepareTransaction({
        client,
        chain: baseSepolia,
        to: transaction.to,
        data: transaction.data,
        value: BigInt(transaction.value || "0"),
      });

      const result = await sendTransaction(tx);

      // Confirm execution
      await fetch(`/api/milestones/${milestoneId}/execute`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ txHash: result.transactionHash }),
      });

      router.refresh();
    } catch (err) {
      console.error("Execute error:", err);
      setError(err instanceof Error ? err.message : "Failed to execute transaction");
    } finally {
      setExecutingId(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-gray-100 text-gray-800";
      case "submitted":
        return "bg-yellow-100 text-yellow-800";
      case "approved":
        return "bg-blue-100 text-blue-800";
      case "paid":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
          {error}
        </div>
      )}

      {milestones.map((milestone) => (
        <div
          key={milestone.id}
          className="border border-gray-200 rounded-lg overflow-hidden"
        >
          <div className="p-4 bg-gray-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-gray-500">
                  #{milestone.order}
                </span>
                <h3 className="font-medium text-gray-900">{milestone.title}</h3>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-gray-900">
                  {formatUSDC(milestone.releaseAmount)}
                </span>
                <span
                  className={`text-xs px-2 py-1 rounded-full font-medium ${getStatusColor(
                    milestone.status
                  )}`}
                >
                  {milestone.status}
                </span>
              </div>
            </div>
          </div>

          <div className="p-4 space-y-3">
            <p className="text-sm text-gray-600">{milestone.description}</p>

            {milestone.proofUrl && (
              <div className="bg-gray-50 rounded p-3">
                <p className="text-xs text-gray-500 mb-1">Proof of completion:</p>
                <a
                  href={milestone.proofUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:text-blue-700 break-all"
                >
                  {milestone.proofUrl}
                </a>
              </div>
            )}

            {milestone.txHash && (
              <div className="bg-green-50 rounded p-3">
                <p className="text-xs text-gray-500 mb-1">Payment transaction:</p>
                <a
                  href={`https://sepolia.basescan.org/tx/${milestone.txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:text-blue-700 font-mono"
                >
                  {milestone.txHash.slice(0, 20)}...
                </a>
              </div>
            )}

            {milestone.status === "pending" && isCreator && (
              <div className="pt-2">
                {expandedId === milestone.id ? (
                  <div className="space-y-3">
                    <input
                      type="url"
                      value={proofUrl}
                      onChange={(e) => setProofUrl(e.target.value)}
                      placeholder="Link to proof of completion (optional)"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleSubmitMilestone(milestone.id)}
                        disabled={isSubmitting}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                      >
                        {isSubmitting ? "Submitting..." : "Submit for Review"}
                      </button>
                      <button
                        onClick={() => {
                          setExpandedId(null);
                          setProofUrl("");
                        }}
                        className="text-gray-600 hover:text-gray-800 px-4 py-2 text-sm"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setExpandedId(milestone.id)}
                    className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                  >
                    Mark as Complete
                  </button>
                )}
              </div>
            )}

            {milestone.status === "submitted" && isSigner && safeAddress && (
              <div className="pt-2">
                <button
                  onClick={() => handleProposePayout(milestone.id)}
                  disabled={isSubmitting}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50"
                >
                  {isSubmitting ? "Proposing..." : "Approve & Propose Payout"}
                </button>
                <p className="text-xs text-gray-500 mt-2">
                  This will propose a transaction to release funds. Other signers will need to approve.
                </p>
              </div>
            )}

            {milestone.status === "approved" && safeAddress && milestone.safeTxHash && (
              <div className="pt-2 space-y-3">
                <SignTransactionButton
                  milestoneId={milestone.id}
                  safeTxHash={milestone.safeTxHash}
                  safeAddress={safeAddress}
                />

                {/* Show execute button when signatures are ready */}
                {(milestone.confirmations || 0) >= 2 && isSigner && (
                  <button
                    onClick={() => handleExecute(milestone.id)}
                    disabled={executingId === milestone.id || isSending}
                    className="w-full bg-green-600 text-white px-4 py-3 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {executingId === milestone.id || isSending ? (
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
                        Executing Payout...
                      </span>
                    ) : (
                      "Execute Payout"
                    )}
                  </button>
                )}

                {(milestone.confirmations || 0) < 2 && (
                  <p className="text-sm text-blue-600">
                    Waiting for {2 - (milestone.confirmations || 0)} more signature(s).
                    {safeAddress && (
                      <a
                        href={`https://app.safe.global/transactions/queue?safe=basesep:${safeAddress}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block mt-1 underline"
                      >
                        View in Safe App
                      </a>
                    )}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// Adjust signature for Safe's eth_sign verification
function adjustSignatureForSafe(signature: string): string {
  const r = signature.slice(0, 66);
  const s = "0x" + signature.slice(66, 130);
  let v = parseInt(signature.slice(130, 132), 16);

  if (v < 30) {
    v += 4;
  }

  return r + s.slice(2) + v.toString(16).padStart(2, "0");
}
