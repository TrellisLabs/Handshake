import { prisma } from "@/lib/db";
import { formatUSDC } from "@/lib/constants";
import { notFound } from "next/navigation";
import { FundButton } from "@/components/FundButton";
import { MilestoneList } from "@/components/MilestoneList";
import { DeploySafeButton } from "@/components/DeploySafeButton";
import Link from "next/link";

export const dynamic = "force-dynamic";

async function getCampaign(id: string) {
  return await prisma.campaign.findUnique({
    where: { id },
    include: {
      milestones: {
        orderBy: { order: "asc" },
      },
      signers: true,
    },
  });
}

export default async function CampaignPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const campaign = await getCampaign(id);

  if (!campaign) {
    notFound();
  }

  const progress = campaign.fundingGoal > 0
    ? Number((campaign.currentFunding * BigInt(100)) / campaign.fundingGoal)
    : 0;

  const creator = campaign.signers.find((s) => s.role === "creator");
  const trustees = campaign.signers.filter((s) => s.role === "trustee");

  return (
    <div className="max-w-4xl mx-auto">
      <Link
        href="/"
        className="text-blue-600 hover:text-blue-700 text-sm mb-4 inline-block"
      >
        &larr; Back to campaigns
      </Link>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span
              className={`text-xs px-2 py-1 rounded-full font-medium ${
                campaign.status === "funding"
                  ? "bg-yellow-100 text-yellow-800"
                  : campaign.status === "active"
                  ? "bg-green-100 text-green-800"
                  : campaign.status === "completed"
                  ? "bg-blue-100 text-blue-800"
                  : "bg-gray-100 text-gray-800"
              }`}
            >
              {campaign.status}
            </span>
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {campaign.name}
          </h1>

          <p className="text-gray-600 mb-6">{campaign.description}</p>

          <div className="mb-4">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-600">
                {formatUSDC(campaign.currentFunding)} raised
              </span>
              <span className="font-medium text-gray-900">
                {formatUSDC(campaign.fundingGoal)} goal
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-blue-600 h-3 rounded-full transition-all"
                style={{ width: `${Math.min(progress, 100)}%` }}
              />
            </div>
            <p className="text-sm text-gray-500 mt-1">{progress}% funded</p>
          </div>

          {!campaign.safeAddress ? (
            <DeploySafeButton
              campaignId={campaign.id}
              signers={campaign.signers.map((s) => s.address)}
            />
          ) : (
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-500 mb-1">Safe Address</p>
                <a
                  href={`https://sepolia.basescan.org/address/${campaign.safeAddress}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-sm text-blue-600 hover:text-blue-700 break-all"
                >
                  {campaign.safeAddress}
                </a>
              </div>

              {campaign.status === "funding" && (
                <FundButton
                  campaignId={campaign.id}
                  safeAddress={campaign.safeAddress}
                />
              )}
            </div>
          )}
        </div>

        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Multi-Sig Signers (2 of 3)
          </h2>
          <div className="space-y-2">
            {creator && (
              <div className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded">
                <span className="font-mono text-sm text-gray-600 truncate mr-2">
                  {creator.address}
                </span>
                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                  Creator
                </span>
              </div>
            )}
            {trustees.map((trustee, i) => (
              <div
                key={trustee.id}
                className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded"
              >
                <span className="font-mono text-sm text-gray-600 truncate mr-2">
                  {trustee.address}
                </span>
                <span className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded">
                  Trustee {i + 1}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Milestones
          </h2>
          <MilestoneList
            milestones={campaign.milestones}
            safeAddress={campaign.safeAddress}
            recipientAddress={campaign.recipientAddress}
            creatorAddress={campaign.creatorAddress}
            signers={campaign.signers.map((s) => s.address)}
          />
        </div>
      </div>
    </div>
  );
}
