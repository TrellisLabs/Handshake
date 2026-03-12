import { prisma } from "@/lib/db";
import { formatUSDC } from "@/lib/constants";
import Link from "next/link";

export const dynamic = "force-dynamic";

async function getCampaigns() {
  return await prisma.campaign.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      milestones: true,
      signers: true,
    },
  });
}

export default async function Home() {
  const campaigns = await getCampaigns();

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Group Buy Campaigns
        </h1>
        <p className="text-gray-600">
          Pool funds for bulk purchases. Multi-sig escrow.
        </p>
      </div>

      {campaigns.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            No campaigns yet
          </h2>
          <p className="text-gray-600 mb-4">
            Be the first to create a group buy campaign.
          </p>
          <Link
            href="/campaigns/new"
            className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700"
          >
            Create Campaign
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {campaigns.map((campaign) => {
            const progress = campaign.fundingGoal > 0
              ? Number((campaign.currentFunding * BigInt(100)) / campaign.fundingGoal)
              : 0;

            return (
              <Link
                key={campaign.id}
                href={`/campaigns/${campaign.id}`}
                className="bg-white rounded-lg shadow hover:shadow-md transition-shadow"
              >
                <div className="p-6">
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
                    <span className="text-sm text-gray-500">
                      {campaign.milestones.length} milestone{campaign.milestones.length !== 1 ? "s" : ""}
                    </span>
                  </div>

                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {campaign.name}
                  </h3>

                  <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                    {campaign.description}
                  </p>

                  <div className="mb-2">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">
                        {formatUSDC(campaign.currentFunding)} raised
                      </span>
                      <span className="font-medium text-gray-900">
                        {formatUSDC(campaign.fundingGoal)}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{ width: `${Math.min(progress, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
