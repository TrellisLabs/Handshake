import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { parseUSDC } from "@/lib/constants";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      name,
      description,
      fundingGoal,
      recipientAddress,
      creatorAddress,
      trustees,
      milestones,
    } = body;

    if (!name || !description || !fundingGoal || !recipientAddress || !creatorAddress) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (!trustees || trustees.length !== 2) {
      return NextResponse.json(
        { error: "Exactly 2 trustees are required" },
        { status: 400 }
      );
    }

    if (!milestones || milestones.length === 0) {
      return NextResponse.json(
        { error: "At least one milestone is required" },
        { status: 400 }
      );
    }

    const fundingGoalBigInt = parseUSDC(fundingGoal);

    const campaign = await prisma.campaign.create({
      data: {
        name,
        description,
        fundingGoal: fundingGoalBigInt,
        currentFunding: BigInt(0),
        recipientAddress,
        creatorAddress,
        status: "funding",
        milestones: {
          create: milestones.map((m: { title: string; description: string; releaseAmount: number; order: number }) => ({
            title: m.title,
            description: m.description,
            releaseAmount: parseUSDC(m.releaseAmount),
            order: m.order,
            status: "pending",
          })),
        },
        signers: {
          create: [
            { address: creatorAddress, role: "creator" },
            { address: trustees[0], role: "trustee" },
            { address: trustees[1], role: "trustee" },
          ],
        },
      },
      include: {
        milestones: true,
        signers: true,
      },
    });

    return NextResponse.json(campaign);
  } catch (error) {
    console.error("Error creating campaign:", error);
    return NextResponse.json(
      { error: "Failed to create campaign" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const campaigns = await prisma.campaign.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        milestones: true,
        signers: true,
      },
    });

    return NextResponse.json(campaigns);
  } catch (error) {
    console.error("Error fetching campaigns:", error);
    return NextResponse.json(
      { error: "Failed to fetch campaigns" },
      { status: 500 }
    );
  }
}
