import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import { isFinanceStaff } from "@/lib/auth/rbac";
import { AuditService } from "@/lib/audit/auditService";
import { PaymentStatus, PaymentMethod } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || !isFinanceStaff(user)) {
      return NextResponse.json({ error: "Unauthorized: Finance staff access required" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "15", 10)));
    const skip = (page - 1) * limit;

    const statusParam = searchParams.get("status");
    const methodParam = searchParams.get("method");
    const search = searchParams.get("search");

    const where: Record<string, unknown> = {};

    if (statusParam && statusParam !== "ALL") {
      where.status = statusParam as PaymentStatus;
    }

    if (methodParam && methodParam !== "ALL") {
      where.paymentMethod = methodParam as PaymentMethod;
    }

    if (search) {
      where.OR = [
        { orderNumber: { contains: search, mode: "insensitive" } },
        { providerTxId: { contains: search, mode: "insensitive" } },
        { student: { fullName: { contains: search, mode: "insensitive" } } },
        { student: { email: { contains: search, mode: "insensitive" } } },
      ];
    }

    const [
      totalOrders,
      orders,
      verifiedAgg,
      refundedAgg,
      verifiedCount,
      pendingCount,
      failedCount,
      refundedCount,
      plans,
      methodsAgg,
    ] = await Promise.all([
      prisma.paymentOrder.count({ where }),
      prisma.paymentOrder.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          student: {
            select: { id: true, fullName: true, fullNameBn: true, email: true, phoneNumber: true },
          },
          plan: {
            select: { id: true, nameBn: true, nameEn: true, code: true, priceBdt: true, durationDays: true },
          },
          transactions: {
            select: { id: true, gateway: true, gatewayTxId: true, amount: true, isVerified: true, createdAt: true },
          },
        },
      }),
      prisma.paymentOrder.aggregate({
        where: { status: PaymentStatus.VERIFIED },
        _sum: { amountBdt: true },
      }),
      prisma.paymentOrder.aggregate({
        where: { status: PaymentStatus.REFUNDED },
        _sum: { amountBdt: true },
      }),
      prisma.paymentOrder.count({ where: { status: PaymentStatus.VERIFIED } }),
      prisma.paymentOrder.count({ where: { status: PaymentStatus.PENDING } }),
      prisma.paymentOrder.count({ where: { status: PaymentStatus.FAILED } }),
      prisma.paymentOrder.count({ where: { status: PaymentStatus.REFUNDED } }),
      prisma.subscriptionPlan.findMany({
        orderBy: { priceBdt: "asc" },
        include: {
          _count: { select: { subscriptions: true, paymentOrders: true } },
        },
      }),
      prisma.paymentOrder.groupBy({
        by: ["paymentMethod"],
        where: { status: PaymentStatus.VERIFIED },
        _sum: { amountBdt: true },
        _count: { id: true },
      }),
    ]);

    return NextResponse.json({
      orders: orders.map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        amountBdt: o.amountBdt,
        status: o.status,
        method: o.paymentMethod,
        trxId: o.providerTxId,
        manualBankRef: o.providerTxId,
        notes: o.notes,
        createdAt: o.createdAt,
        verifiedAt: o.status === PaymentStatus.VERIFIED ? o.updatedAt : null,
        user: {
          id: o.student.id,
          fullName: o.student.fullNameBn || o.student.fullName,
          email: o.student.email,
          phone: o.student.phoneNumber,
        },
        subscriptionPlan: o.plan,
        transactions: o.transactions,
      })),
      total: totalOrders,
      page,
      limit,
      totalPages: Math.ceil(totalOrders / limit),
      summary: {
        verifiedRevenueBdt: verifiedAgg._sum.amountBdt || 0,
        refundedRevenueBdt: refundedAgg._sum.amountBdt || 0,
        netRevenueBdt: (verifiedAgg._sum.amountBdt || 0) - (refundedAgg._sum.amountBdt || 0),
        verifiedCount,
        pendingCount,
        failedCount,
        refundedCount,
        totalOrders,
        methodBreakdown: methodsAgg.map((m) => ({
          method: m.paymentMethod,
          totalRevenueBdt: m._sum.amountBdt || 0,
          ordersCount: m._count.id,
        })),
      },
      plans: plans.map((p) => ({
        id: p.id,
        nameBn: p.nameBn,
        nameEn: p.nameEn,
        tier: p.code,
        category: p.category,
        priceBdt: p.priceBdt,
        durationDays: p.durationDays,
        isActive: p.isActive,
        activeSubscribers: p._count.subscriptions,
        totalOrders: p._count.paymentOrders,
      })),
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Admin finance GET error:", err);
    return NextResponse.json({ error: err.message || "Failed to retrieve finance data" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || !isFinanceStaff(user)) {
      return NextResponse.json({ error: "Unauthorized: Finance staff only" }, { status: 403 });
    }

    const body = await req.json();
    const orderId = body.orderId;
    const action = (body.action || body.status || "").toUpperCase();
    const reason = body.reason;
    const providerTxId = body.providerTxId || body.trxId;

    if (!orderId || !action) {
      return NextResponse.json({ error: "orderId and action/status are required" }, { status: 400 });
    }

    const order = await prisma.paymentOrder.findUnique({
      where: { id: orderId },
      include: { plan: true },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const ipAddress = req.headers.get("x-forwarded-for") || undefined;

    if (action === "VERIFY" || action === "VERIFIED") {
      const updated = await prisma.$transaction(async (tx) => {
        const o = await tx.paymentOrder.update({
          where: { id: orderId },
          data: {
            status: PaymentStatus.VERIFIED,
            providerTxId: providerTxId || order.providerTxId,
            notes: reason || "Manually verified by finance administrator",
          },
        });

        // Activate or create Subscription
        if (order.planId && order.plan) {
          const startDate = new Date();
          const endDate = new Date(startDate.getTime() + order.plan.durationDays * 24 * 60 * 60 * 1000);

          await tx.subscription.create({
            data: {
              studentId: order.studentId,
              planId: order.planId,
              orderId: order.id,
              status: "ACTIVE",
              startDate,
              endDate,
            },
          });
        }

        return o;
      });

      await AuditService.log({
        userId: user.id,
        action: "PAYMENT_ORDER_VERIFIED",
        resource: "PaymentOrder",
        resourceId: orderId,
        details: {
          orderNumber: order.orderNumber,
          amountBdt: order.amountBdt,
          reason,
        },
        ipAddress,
      });

      return NextResponse.json({ success: true, message: "Order verified and subscription activated", order: updated });
    }

    if (action === "REFUND" || action === "REFUNDED") {
      const updated = await prisma.paymentOrder.update({
        where: { id: orderId },
        data: {
          status: PaymentStatus.REFUNDED,
          notes: reason || "Refund processed by finance staff",
        },
      });

      await AuditService.log({
        userId: user.id,
        action: "PAYMENT_ORDER_REFUNDED",
        resource: "PaymentOrder",
        resourceId: orderId,
        details: {
          orderNumber: order.orderNumber,
          amountBdt: order.amountBdt,
          reason,
        },
        ipAddress,
      });

      return NextResponse.json({ success: true, message: "Order status set to REFUNDED", order: updated });
    }

    return NextResponse.json({ error: `Unsupported action: ${action}` }, { status: 400 });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Admin finance PATCH error:", err);
    return NextResponse.json({ error: err.message || "Failed to perform financial action" }, { status: 400 });
  }
}
