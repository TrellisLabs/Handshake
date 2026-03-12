import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getApiKit, getTransaction } from "@/lib/safe";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { safeTxHash, signature, signerAddress } = body;

    if (!safeTxHash || !signature || !signerAddress) {
      return NextResponse.json(
        { error: "safeTxHash, signature, and signerAddress are required" },
        { status: 400 }
      );
    }

    const milestone = await prisma.milestone.findUnique({
      where: { id },
      include: { campaign: { include: { signers: true } } },
    });

    if (!milestone) {
      return NextResponse.json(
        { error: "Milestone not found" },
        { status: 404 }
      );
    }

    if (milestone.status !== "approved") {
      return NextResponse.json(
        { error: "Milestone must be in approved status to sign" },
        { status: 400 }
      );
    }

    if (milestone.safeTxHash !== safeTxHash) {
      return NextResponse.json(
        { error: "safeTxHash does not match milestone" },
        { status: 400 }
      );
    }

    // Verify signer is authorized
    const isAuthorized = milestone.campaign.signers.some(
      (s) => s.address.toLowerCase() === signerAddress.toLowerCase()
    );
    if (!isAuthorized) {
      return NextResponse.json(
        { error: "Signer not authorized for this campaign" },
        { status: 403 }
      );
    }

    // Submit signature to Safe Transaction Service
    const apiKit = await getApiKit();
    await apiKit.confirmTransaction(safeTxHash, signature);

    // Get updated confirmation count
    const txInfo = await getTransaction(safeTxHash);
    const confirmations = txInfo.confirmations?.length || 0;

    // Update milestone with confirmation count
    await prisma.milestone.update({
      where: { id },
      data: { confirmations },
    });

    return NextResponse.json({
      success: true,
      confirmations,
      threshold: 2,
      message: confirmations >= 2
        ? "Threshold reached! Transaction can be executed."
        : `Signature added. ${2 - confirmations} more signature(s) needed.`,
    });
  } catch (error) {
    console.error("Error signing transaction:", error);
    return NextResponse.json(
      { error: "Failed to submit signature" },
      { status: 500 }
    );
  }
}

// GET: Get current signature status
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const milestone = await prisma.milestone.findUnique({
      where: { id },
      include: { campaign: true },
    });

    if (!milestone) {
      return NextResponse.json(
        { error: "Milestone not found" },
        { status: 404 }
      );
    }

    if (!milestone.safeTxHash) {
      return NextResponse.json(
        { error: "No pending transaction for this milestone" },
        { status: 404 }
      );
    }

    // Get current confirmations from Safe TX Service
    try {
      const txInfo = await getTransaction(milestone.safeTxHash);
      const confirmations = txInfo.confirmations?.length || 0;
      const signers = txInfo.confirmations?.map((c: { owner: string }) => c.owner) || [];

      // Update milestone if confirmation count changed
      if (confirmations !== milestone.confirmations) {
        await prisma.milestone.update({
          where: { id },
          data: { confirmations },
        });
      }

      return NextResponse.json({
        safeTxHash: milestone.safeTxHash,
        confirmations,
        threshold: 2,
        signers,
        canExecute: confirmations >= 2,
      });
    } catch {
      // Transaction might not be on Safe TX Service yet
      return NextResponse.json({
        safeTxHash: milestone.safeTxHash,
        confirmations: milestone.confirmations,
        threshold: 2,
        signers: [],
        canExecute: false,
      });
    }
  } catch (error) {
    console.error("Error getting signature status:", error);
    return NextResponse.json(
      { error: "Failed to get signature status" },
      { status: 500 }
    );
  }
}
