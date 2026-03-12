import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSafeBalance } from "@/lib/safe";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const campaign = await prisma.campaign.findUnique({
      where: { id },
    });

    if (!campaign) {
      return NextResponse.json(
        { error: "Campaign not found" },
        { status: 404 }
      );
    }

    if (!campaign.safeAddress) {
      return NextResponse.json(
        { error: "No Safe address configured" },
        { status: 400 }
      );
    }

    const balance = await getSafeBalance(campaign.safeAddress);

    const updatedCampaign = await prisma.campaign.update({
      where: { id },
      data: {
        currentFunding: balance,
        status: balance >= campaign.fundingGoal ? "active" : "funding",
      },
    });

    return NextResponse.json({
      currentFunding: balance.toString(),
      status: updatedCampaign.status,
    });
  } catch (error) {
    console.error("Error syncing balance:", error);
    return NextResponse.json(
      { error: "Failed to sync balance" },
      { status: 500 }
    );
  }
}
