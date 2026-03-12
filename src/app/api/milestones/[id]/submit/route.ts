import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { proofUrl } = body;

    const milestone = await prisma.milestone.findUnique({
      where: { id },
    });

    if (!milestone) {
      return NextResponse.json(
        { error: "Milestone not found" },
        { status: 404 }
      );
    }

    if (milestone.status !== "pending") {
      return NextResponse.json(
        { error: "Milestone already submitted or completed" },
        { status: 400 }
      );
    }

    const updatedMilestone = await prisma.milestone.update({
      where: { id },
      data: {
        status: "submitted",
        proofUrl: proofUrl || null,
      },
    });

    return NextResponse.json(updatedMilestone);
  } catch (error) {
    console.error("Error submitting milestone:", error);
    return NextResponse.json(
      { error: "Failed to submit milestone" },
      { status: 500 }
    );
  }
}
