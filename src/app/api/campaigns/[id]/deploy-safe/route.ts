import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createDeploymentTransaction, isSafeDeployed } from "@/lib/safe-client";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const campaign = await prisma.campaign.findUnique({
      where: { id },
      include: { signers: true },
    });

    if (!campaign) {
      return NextResponse.json(
        { error: "Campaign not found" },
        { status: 404 }
      );
    }

    if (campaign.safeAddress) {
      return NextResponse.json(
        { error: "Safe already deployed" },
        { status: 400 }
      );
    }

    const owners = campaign.signers.map((s) => s.address);
    const threshold = 2;

    // Get deployment transaction data for client-side execution
    const { address, deploymentTransaction } = await createDeploymentTransaction(
      owners,
      threshold
    );

    return NextResponse.json({
      predictedAddress: address,
      transaction: {
        to: deploymentTransaction.to,
        data: deploymentTransaction.data,
        value: deploymentTransaction.value,
      },
      owners,
      threshold,
    });
  } catch (error) {
    console.error("Error preparing Safe deployment:", error);
    return NextResponse.json(
      { error: "Failed to prepare Safe deployment" },
      { status: 500 }
    );
  }
}

// Confirm Safe deployment - called after transaction is mined
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { safeAddress, txHash } = body;

    if (!safeAddress || !safeAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
      return NextResponse.json(
        { error: "Invalid Safe address" },
        { status: 400 }
      );
    }

    const campaign = await prisma.campaign.findUnique({
      where: { id },
    });

    if (!campaign) {
      return NextResponse.json(
        { error: "Campaign not found" },
        { status: 404 }
      );
    }

    if (campaign.safeAddress) {
      return NextResponse.json(
        { error: "Safe already deployed" },
        { status: 400 }
      );
    }

    // Verify the Safe is actually deployed
    const deployed = await isSafeDeployed(safeAddress);
    if (!deployed) {
      return NextResponse.json(
        { error: "Safe not found at the provided address. Please wait for the transaction to confirm." },
        { status: 400 }
      );
    }

    // Update campaign with Safe address
    const updatedCampaign = await prisma.campaign.update({
      where: { id },
      data: { safeAddress },
    });

    return NextResponse.json({
      campaign: updatedCampaign,
      message: "Safe deployed and linked to campaign",
      txHash,
    });
  } catch (error) {
    console.error("Error confirming Safe deployment:", error);
    return NextResponse.json(
      { error: "Failed to confirm Safe deployment" },
      { status: 500 }
    );
  }
}
