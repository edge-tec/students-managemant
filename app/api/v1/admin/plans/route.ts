import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import { isAdmin } from "@/lib/auth/rbac";
import { AuditService } from "@/lib/audit/auditService";
import { PlanCreateSchema } from "@/lib/validation/schemas";
import { ExamCategoryType } from "@prisma/client";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || !isAdmin(user)) {
      return NextResponse.json({ error: "Unauthorized: Admin privileges required" }, { status: 403 });
    }

    const plans = await prisma.subscriptionPlan.findMany({
      orderBy: { priceBdt: "asc" },
      include: {
        _count: {
          select: {
            subscriptions: true,
            paymentOrders: true,
          },
        },
      },
    });

    const formatted = plans.map((p) => {
      let features: string[] = [];
      try {
        features = JSON.parse(p.featuresJson);
      } catch {
        features = [];
      }
      return {
        ...p,
        features,
        totalSubscriptions: p._count.subscriptions,
        totalOrders: p._count.paymentOrders,
      };
    });

    return NextResponse.json({ plans: formatted });
  } catch (error: any) {
    console.error("Admin fetch plans error:", error);
    return NextResponse.json({ error: error.message || "Failed to load plans" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || !isAdmin(user)) {
      return NextResponse.json({ error: "Unauthorized: Admin privileges required" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = PlanCreateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const {
      code,
      nameBn,
      nameEn,
      descriptionBn,
      descriptionEn,
      priceBdt,
      durationDays,
      category,
      features,
      isActive,
    } = parsed.data;

    // Check code uniqueness
    const existing = await prisma.subscriptionPlan.findUnique({
      where: { code: code.toUpperCase() },
    });

    if (existing) {
      return NextResponse.json(
        { error: `Plan code '${code}' is already in use. Please use a unique code.` },
        { status: 409 }
      );
    }

    const newPlan = await prisma.subscriptionPlan.create({
      data: {
        code: code.toUpperCase(),
        nameBn,
        nameEn,
        descriptionBn: descriptionBn || null,
        descriptionEn: descriptionEn || null,
        priceBdt,
        durationDays,
        category: category ? (category as ExamCategoryType) : null,
        featuresJson: JSON.stringify(features || []),
        isActive,
      },
    });

    await AuditService.log({
      userId: user.id,
      action: "SUBSCRIPTION_PLAN_CREATED",
      resource: "SubscriptionPlan",
      resourceId: newPlan.id,
      details: {
        code: newPlan.code,
        priceBdt: newPlan.priceBdt,
        durationDays: newPlan.durationDays,
      },
    });

    return NextResponse.json({
      message: "Subscription plan created successfully",
      plan: {
        ...newPlan,
        features,
      },
    });
  } catch (error: any) {
    console.error("Admin create plan error:", error);
    return NextResponse.json({ error: error.message || "Failed to create plan" }, { status: 500 });
  }
}
