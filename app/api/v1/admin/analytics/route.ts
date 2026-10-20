import { NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import { isAdmin } from "@/lib/auth/rbac";
import { PaymentStatus } from "@prisma/client";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || !isAdmin(user)) {
      return NextResponse.json({ error: "Unauthorized administrative access" }, { status: 403 });
    }

    const [
      totalStudents,
      totalQuestions,
      publishedQuestions,
      totalExamsTaken,
      activeSubscriptions,
      verifiedPaymentsSum,
      recentUsers,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.question.count(),
      prisma.question.count({ where: { status: "PUBLISHED" } }),
      prisma.examSession.count({ where: { status: "EVALUATED" } }),
      prisma.subscription.count({ where: { status: "ACTIVE" } }),
      prisma.paymentOrder.aggregate({
        where: { status: PaymentStatus.VERIFIED },
        _sum: { amountBdt: true },
      }),
      prisma.user.findMany({
        take: 5,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          fullName: true,
          email: true,
          createdAt: true,
          userRoles: { include: { role: true } },
        },
      }),
    ]);

    return NextResponse.json({
      analytics: {
        totalStudents,
        totalQuestions,
        publishedQuestions,
        totalExamsTaken,
        activeSubscriptions,
        verifiedRevenueBdt: verifiedPaymentsSum._sum.amountBdt || 0,
      },
      recentUsers,
    });
  } catch (error) {
    console.error("Admin analytics error:", error);
    return NextResponse.json({ error: "Failed to generate analytics" }, { status: 500 });
  }
}
