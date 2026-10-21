import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import { isAdmin } from "@/lib/auth/rbac";
import { AuditService } from "@/lib/audit/auditService";
import { PlanUpdateSchema } from "@/lib/validation/schemas";
import { ExamCategoryType } from "@prisma/client";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user || !isAdmin(user)) {
      return NextResponse.json({ error: "Unauthorized: Admin privileges required" }, { status: 403 });
    }

    const { id } = await params;
    const plan = await prisma.subscriptionPlan.findUnique({
      where: { id },
    });

    if (!plan) {
      return NextResponse.json({ error: "Plan not found" }, { status: 404 });
    }

    let features: string[] = [];
    try {
      features = JSON.parse(plan.featuresJson);
    } catch {
      features = [];
    }

    return NextResponse.json({ plan: { ...plan, features } });
  } catch (error: any) {
    console.error("Admin fetch plan by id error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch plan" }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user || !isAdmin(user)) {
      return NextResponse.json({ error: "Unauthorized: Admin privileges required" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const parsed = PlanUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const existingPlan = await prisma.subscriptionPlan.findUnique({
      where: { id },
    });

    if (!existingPlan) {
      return NextResponse.json({ error: "Plan not found" }, { status: 404 });
    }

    const data: Record<string, any> = {};

    if (parsed.data.nameBn !== undefined) data.nameBn = parsed.data.nameBn;
    if (parsed.data.nameEn !== undefined) data.nameEn = parsed.data.nameEn;
    if (parsed.data.descriptionBn !== undefined) data.descriptionBn = parsed.data.descriptionBn;
    if (parsed.data.descriptionEn !== undefined) data.descriptionEn = parsed.data.descriptionEn;
    if (parsed.data.priceBdt !== undefined) data.priceBdt = parsed.data.priceBdt;
    if (parsed.data.durationDays !== undefined) data.durationDays = parsed.data.durationDays;
    if (parsed.data.category !== undefined) {
      data.category = parsed.data.category ? (parsed.data.category as ExamCategoryType) : null;
    }
    if (parsed.data.features !== undefined) {
      data.featuresJson = JSON.stringify(parsed.data.features);
    }
    if (parsed.data.isActive !== undefined) data.isActive = parsed.data.isActive;

    const updated = await prisma.subscriptionPlan.update({
      where: { id },
      data,
    });

    await AuditService.log({
      userId: user.id,
      action: "SUBSCRIPTION_PLAN_UPDATED",
      resource: "SubscriptionPlan",
      resourceId: updated.id,
      details: {
        code: updated.code,
        previousPrice: existingPlan.priceBdt,
        newPrice: updated.priceBdt,
        previousDuration: existingPlan.durationDays,
        newDuration: updated.durationDays,
        updatedFields: Object.keys(data),
      },
    });

    let features: string[] = [];
    try {
      features = JSON.parse(updated.featuresJson);
    } catch {
      features = [];
    }

    return NextResponse.json({
      message: "Subscription plan updated successfully",
      plan: {
        ...updated,
        features,
      },
    });
  } catch (error: any) {
    console.error("Admin update plan error:", error);
    return NextResponse.json({ error: error.message || "Failed to update plan" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user || !isAdmin(user)) {
      return NextResponse.json({ error: "Unauthorized: Admin privileges required" }, { status: 403 });
    }

    const { id } = await params;

    // Check if plan has active subscriptions
    const activeSubs = await prisma.subscription.count({
      where: { planId: id, status: "ACTIVE" },
    });

    if (activeSubs > 0) {
      // Deactivate instead of hard delete
      await prisma.subscriptionPlan.update({
        where: { id },
        data: { isActive: false },
      });

      return NextResponse.json({
        message: "Plan has active student subscriptions. Plan has been deactivated instead of deleted.",
        deactivated: true,
      });
    }

    // Check if order references exist
    const totalOrders = await prisma.paymentOrder.count({
      where: { planId: id },
    });

    if (totalOrders > 0) {
      await prisma.subscriptionPlan.update({
        where: { id },
        data: { isActive: false },
      });

      return NextResponse.json({
        message: "Plan has historical orders. Plan has been marked inactive.",
        deactivated: true,
      });
    }

    await prisma.subscriptionPlan.delete({
      where: { id },
    });

    await AuditService.log({
      userId: user.id,
      action: "SUBSCRIPTION_PLAN_DELETED",
      resource: "SubscriptionPlan",
      resourceId: id,
    });

    return NextResponse.json({ message: "Subscription plan removed successfully" });
  } catch (error: any) {
    console.error("Admin delete plan error:", error);
    return NextResponse.json({ error: error.message || "Failed to delete plan" }, { status: 500 });
  }
}
