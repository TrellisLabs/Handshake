import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createTokenTransferTransaction } from "@/lib/safe";
import { createUnsignedTransaction } from "@/lib/safe-client";
import { CHAIN_ID } from "@/lib/constants";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { safeAddress, recipientAddress } = body;

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

    if (milestone.status !== "submitted") {
      return NextResponse.json(
        { error: "Milestone must be submitted before proposing payout" },
        { status: 400 }
      );
    }

    if (!safeAddress) {
      return NextResponse.json(
        { error: "Safe address is required" },
        { status: 400 }
      );
    }

    // Create the USDC transfer transaction data
    const transferTx = await createTokenTransferTransaction(
      recipientAddress,
      milestone.releaseAmount
    );

    // Create unsigned Safe transaction and get the hash
    const { safeTxHash, safeTransactionData } = await createUnsignedTransaction({
      safeAddress,
      to: transferTx.to,
      data: transferTx.data,
      value: transferTx.value,
    });

    // Update milestone with safeTxHash for tracking
    await prisma.milestone.update({
      where: { id },
      data: {
        status: "approved",
        safeTxHash,
      },
    });

    // Return the EIP-712 typed data for signing
    return NextResponse.json({
      safeTxHash,
      safeTransactionData,
      safeAddress,
      chainId: CHAIN_ID,
      // EIP-712 typed data for client-side signing
      typedData: {
        types: {
          EIP712Domain: [
            { name: "chainId", type: "uint256" },
            { name: "verifyingContract", type: "address" },
          ],
          SafeTx: [
            { name: "to", type: "address" },
            { name: "value", type: "uint256" },
            { name: "data", type: "bytes" },
            { name: "operation", type: "uint8" },
            { name: "safeTxGas", type: "uint256" },
            { name: "baseGas", type: "uint256" },
            { name: "gasPrice", type: "uint256" },
            { name: "gasToken", type: "address" },
            { name: "refundReceiver", type: "address" },
            { name: "nonce", type: "uint256" },
          ],
        },
        domain: {
          chainId: CHAIN_ID,
          verifyingContract: safeAddress,
        },
        primaryType: "SafeTx",
        message: {
          to: safeTransactionData.to,
          value: safeTransactionData.value,
          data: safeTransactionData.data,
          operation: safeTransactionData.operation,
          safeTxGas: safeTransactionData.safeTxGas,
          baseGas: safeTransactionData.baseGas,
          gasPrice: safeTransactionData.gasPrice,
          gasToken: safeTransactionData.gasToken,
          refundReceiver: safeTransactionData.refundReceiver,
          nonce: safeTransactionData.nonce,
        },
      },
      message: "Transaction prepared. Please sign to propose.",
    });
  } catch (error) {
    console.error("Error proposing milestone payout:", error);
    return NextResponse.json(
      { error: "Failed to propose payout" },
      { status: 500 }
    );
  }
}

// GET: Retrieve pending transaction for a milestone
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

    return NextResponse.json({
      safeTxHash: milestone.safeTxHash,
      confirmations: milestone.confirmations,
      status: milestone.status,
    });
  } catch (error) {
    console.error("Error getting milestone transaction:", error);
    return NextResponse.json(
      { error: "Failed to get transaction" },
      { status: 500 }
    );
  }
}
