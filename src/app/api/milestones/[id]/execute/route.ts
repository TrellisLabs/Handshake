import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getTransaction } from "@/lib/safe";
import Safe, { EthSafeSignature } from "@safe-global/protocol-kit";
import { RPC_URL } from "@/lib/constants";

// POST: Get execution transaction data
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

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
        { error: "Milestone must be approved to execute" },
        { status: 400 }
      );
    }

    if (!milestone.safeTxHash) {
      return NextResponse.json(
        { error: "No pending transaction for this milestone" },
        { status: 400 }
      );
    }

    const safeAddress = milestone.campaign.safeAddress;
    if (!safeAddress) {
      return NextResponse.json(
        { error: "Campaign Safe address not set" },
        { status: 400 }
      );
    }

    // Get the transaction from Safe TX Service
    const safeTx = await getTransaction(milestone.safeTxHash);

    // Check if we have enough confirmations
    const confirmations = safeTx.confirmations?.length || 0;
    if (confirmations < 2) {
      return NextResponse.json(
        { error: `Not enough signatures. Have ${confirmations}/2.` },
        { status: 400 }
      );
    }

    // Initialize Protocol Kit to create the execution transaction
    const protocolKit = await Safe.init({
      provider: RPC_URL,
      safeAddress,
    });

    // Reconstruct the SafeTransaction from the API response
    const safeTransaction = await protocolKit.createTransaction({
      transactions: [{
        to: safeTx.to,
        value: safeTx.value,
        data: safeTx.data || "0x",
        operation: safeTx.operation,
      }],
      options: {
        safeTxGas: String(safeTx.safeTxGas),
        baseGas: String(safeTx.baseGas),
        gasPrice: String(safeTx.gasPrice),
        gasToken: safeTx.gasToken,
        refundReceiver: safeTx.refundReceiver,
        nonce: Number(safeTx.nonce),
      },
    });

    // Add all the collected signatures using EthSafeSignature
    for (const confirmation of safeTx.confirmations || []) {
      const signature = new EthSafeSignature(
        confirmation.owner,
        confirmation.signature
      );
      safeTransaction.addSignature(signature);
    }

    // Encode the execTransaction call
    const encodedTx = await protocolKit.getEncodedTransaction(safeTransaction);

    return NextResponse.json({
      transaction: {
        to: safeAddress,
        data: encodedTx,
        value: "0",
      },
      safeTxHash: milestone.safeTxHash,
      message: "Execute this transaction to release the funds",
    });
  } catch (error) {
    console.error("Error preparing execution:", error);
    return NextResponse.json(
      { error: "Failed to prepare execution" },
      { status: 500 }
    );
  }
}

// PUT: Confirm execution completed
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { txHash } = body;

    if (!txHash) {
      return NextResponse.json(
        { error: "Transaction hash is required" },
        { status: 400 }
      );
    }

    const milestone = await prisma.milestone.findUnique({
      where: { id },
    });

    if (!milestone) {
      return NextResponse.json(
        { error: "Milestone not found" },
        { status: 404 }
      );
    }

    // Update milestone to paid status
    const updatedMilestone = await prisma.milestone.update({
      where: { id },
      data: {
        status: "paid",
        txHash,
      },
    });

    return NextResponse.json({
      milestone: updatedMilestone,
      message: "Payout executed successfully!",
      explorerUrl: `https://sepolia.basescan.org/tx/${txHash}`,
    });
  } catch (error) {
    console.error("Error confirming execution:", error);
    return NextResponse.json(
      { error: "Failed to confirm execution" },
      { status: 500 }
    );
  }
}
