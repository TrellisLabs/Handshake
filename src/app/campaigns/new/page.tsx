"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useActiveAccount } from "thirdweb/react";

interface MilestoneInput {
  title: string;
  description: string;
  releaseAmount: string;
}

export default function NewCampaignPage() {
  const router = useRouter();
  const account = useActiveAccount();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [fundingGoal, setFundingGoal] = useState("");
  const [recipientAddress, setRecipientAddress] = useState("");
  const [trustee1, setTrustee1] = useState("");
  const [trustee2, setTrustee2] = useState("");
  const [milestones, setMilestones] = useState<MilestoneInput[]>([
    { title: "", description: "", releaseAmount: "" },
  ]);

  const addMilestone = () => {
    setMilestones([...milestones, { title: "", description: "", releaseAmount: "" }]);
  };

  const removeMilestone = (index: number) => {
    if (milestones.length > 1) {
      setMilestones(milestones.filter((_, i) => i !== index));
    }
  };

  const updateMilestone = (index: number, field: keyof MilestoneInput, value: string) => {
    const updated = [...milestones];
    updated[index][field] = value;
    setMilestones(updated);
  };

  const totalMilestoneAmount = milestones.reduce(
    (sum, m) => sum + (parseFloat(m.releaseAmount) || 0),
    0
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!account?.address) {
      setError("Please connect your wallet first");
      return;
    }

    const goalAmount = parseFloat(fundingGoal);
    if (Math.abs(totalMilestoneAmount - goalAmount) > 0.01) {
      setError(`Milestone amounts ($${totalMilestoneAmount.toFixed(2)}) must equal funding goal ($${goalAmount.toFixed(2)})`);
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description,
          fundingGoal: goalAmount,
          recipientAddress,
          creatorAddress: account.address,
          trustees: [trustee1, trustee2].filter(Boolean),
          milestones: milestones.map((m, i) => ({
            title: m.title,
            description: m.description,
            releaseAmount: parseFloat(m.releaseAmount),
            order: i + 1,
          })),
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create campaign");
      }

      const campaign = await response.json();
      router.push(`/campaigns/${campaign.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create campaign");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!account) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Create a Group Buy Campaign
          </h1>
          <p className="text-gray-600 mb-6">
            Connect wallet to continue.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        Create a Group Buy Campaign
      </h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
            {error}
          </div>
        )}

        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Campaign Details</h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Campaign Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., Hydroponic Nutrients Group Buy"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Describe what you're purchasing and why..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Funding Goal (USDC)
            </label>
            <input
              type="number"
              value={fundingGoal}
              onChange={(e) => setFundingGoal(e.target.value)}
              required
              min="1"
              step="0.01"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="1000"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Recipient Address
            </label>
            <input
              type="text"
              value={recipientAddress}
              onChange={(e) => setRecipientAddress(e.target.value)}
              required
              pattern="^0x[a-fA-F0-9]{40}$"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
              placeholder="0x..."
            />
            <p className="mt-1 text-sm text-gray-500">
              Payout address
            </p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Trustees (2-of-3 Multi-Sig)
          </h2>
          <p className="text-sm text-gray-600">
            2 of 3 signatures required to release funds.
          </p>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Your Address (Creator)
            </label>
            <input
              type="text"
              value={account.address}
              disabled
              className="w-full px-3 py-2 border border-gray-200 bg-gray-50 rounded-lg font-mono text-sm text-gray-600"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Trustee 1 Address
            </label>
            <input
              type="text"
              value={trustee1}
              onChange={(e) => setTrustee1(e.target.value)}
              required
              pattern="^0x[a-fA-F0-9]{40}$"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
              placeholder="0x..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Trustee 2 Address
            </label>
            <input
              type="text"
              value={trustee2}
              onChange={(e) => setTrustee2(e.target.value)}
              required
              pattern="^0x[a-fA-F0-9]{40}$"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
              placeholder="0x..."
            />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Milestones</h2>
              <p className="text-sm text-gray-600">
                Total must equal funding goal.
              </p>
            </div>
            <button
              type="button"
              onClick={addMilestone}
              className="text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              + Add Milestone
            </button>
          </div>

          {milestones.map((milestone, index) => (
            <div key={index} className="border border-gray-200 rounded-lg p-4 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-500">
                  Milestone {index + 1}
                </span>
                {milestones.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeMilestone(index)}
                    className="text-red-600 hover:text-red-700 text-sm"
                  >
                    Remove
                  </button>
                )}
              </div>

              <div>
                <input
                  type="text"
                  value={milestone.title}
                  onChange={(e) => updateMilestone(index, "title", e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Milestone title"
                />
              </div>

              <div>
                <textarea
                  value={milestone.description}
                  onChange={(e) => updateMilestone(index, "description", e.target.value)}
                  required
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="What needs to be completed for this milestone?"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Release Amount (USDC)
                </label>
                <input
                  type="number"
                  value={milestone.releaseAmount}
                  onChange={(e) => updateMilestone(index, "releaseAmount", e.target.value)}
                  required
                  min="0"
                  step="0.01"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="500"
                />
              </div>
            </div>
          ))}

          <div className="flex justify-between items-center pt-2 border-t border-gray-200">
            <span className="text-sm text-gray-600">Total milestone amounts:</span>
            <span className={`font-medium ${
              fundingGoal && Math.abs(totalMilestoneAmount - parseFloat(fundingGoal)) < 0.01
                ? "text-green-600"
                : "text-gray-900"
            }`}>
              ${totalMilestoneAmount.toFixed(2)}
              {fundingGoal && (
                <span className="text-gray-500"> / ${parseFloat(fundingGoal).toFixed(2)}</span>
              )}
            </span>
          </div>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? "Creating Campaign..." : "Create Campaign"}
        </button>
      </form>
    </div>
  );
}
