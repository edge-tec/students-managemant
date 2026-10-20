import { NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";

export async function GET() {
  try {
    const plans = await prisma.subscriptionPlan.findMany({
      where: { isActive: true },
      orderBy: { priceBdt: "asc" },
    });

    const parsedPlans = plans.map((plan) => {
      let features: string[] = [];
      try {
        features = JSON.parse(plan.featuresJson);
      } catch {
        features = [];
      }
      return {
        ...plan,
        features,
      };
    });

    return NextResponse.json({ plans: parsedPlans });
  } catch (error) {
    console.error("Subscription plans error:", error);
    return NextResponse.json({ error: "Failed to load plans" }, { status: 500 });
  }
}
