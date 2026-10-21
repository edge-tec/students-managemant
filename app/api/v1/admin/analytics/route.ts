import { NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import { isAnyStaff } from "@/lib/auth/rbac";
import { PaymentStatus, ExamSessionStatus } from "@prisma/client";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || !isAnyStaff(user)) {
      return NextResponse.json({ error: "Unauthorized administrative access" }, { status: 403 });
    }

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [
      totalStudents,
      activeStudentsCount,
      totalQuestions,
      draftQuestions,
      reviewQuestions,
      approvedQuestions,
      publishedQuestions,
      totalExams,
      publishedExams,
      totalExamSessions,
      evaluatedExamSessions,
      pendingGradingSessions,
      activeSubscriptions,
      verifiedPaymentsSum,
      pendingPaymentsCount,
      recentUsers,
      subjectBreakdown,
      recentAuditLogs,
    ] = await Promise.all([
      // Total registered users
      prisma.user.count(),
      // Active users (participated in an exam session in last 30 days)
      prisma.examSession.groupBy({
        by: ["studentId"],
        where: { createdAt: { gte: thirtyDaysAgo } },
      }).then((res) => res.length),
      // Question statuses
      prisma.question.count(),
      prisma.question.count({ where: { status: "DRAFT" } }),
      prisma.question.count({ where: { status: "REVIEW" } }),
      prisma.question.count({ where: { status: "APPROVED" } }),
      prisma.question.count({ where: { status: "PUBLISHED" } }),
      // Exams
      prisma.exam.count(),
      prisma.exam.count({ where: { status: "PUBLISHED" } }),
      // Exam sessions & grading backlog
      prisma.examSession.count(),
      prisma.examSession.count({ where: { status: ExamSessionStatus.EVALUATED } }),
      prisma.examSession.count({ where: { status: ExamSessionStatus.SUBMITTED } }),
      // Subscriptions & Finance
      prisma.subscription.count({ where: { status: "ACTIVE" } }),
      prisma.paymentOrder.aggregate({
        where: { status: PaymentStatus.VERIFIED },
        _sum: { amountBdt: true },
      }),
      prisma.paymentOrder.count({ where: { status: PaymentStatus.PENDING } }),
      // Recent users
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
      // Question distribution across subjects
      prisma.subject.findMany({
        take: 8,
        select: {
          id: true,
          nameEn: true,
          nameBn: true,
          _count: { select: { questions: true } },
        },
        orderBy: { questions: { _count: "desc" } },
      }),
      // Recent audit events
      prisma.auditLog.findMany({
        take: 6,
        orderBy: { createdAt: "desc" },
        include: {
          user: { select: { fullName: true, email: true } },
        },
      }),
    ]);

    return NextResponse.json({
      analytics: {
        totalStudents,
        activeStudents: activeStudentsCount,
        totalQuestions,
        draftQuestions,
        reviewQuestions,
        approvedQuestions,
        publishedQuestions,
        reviewBacklog: reviewQuestions,
        totalExams,
        publishedExams,
        totalExamsTaken: totalExamSessions,
        evaluatedExams: evaluatedExamSessions,
        gradingBacklog: pendingGradingSessions,
        activeSubscriptions,
        verifiedRevenueBdt: verifiedPaymentsSum._sum.amountBdt || 0,
        pendingPaymentsCount,
      },
      subjectBreakdown: subjectBreakdown.map((s) => ({
        id: s.id,
        name: s.nameBn || s.nameEn,
        count: s._count.questions,
      })),
      recentUsers,
      recentAuditLogs: recentAuditLogs.map((log) => ({
        id: log.id,
        action: log.action,
        resource: log.resource,
        actor: log.user ? log.user.fullName : "System",
        createdAt: log.createdAt,
      })),
    });
  } catch (error) {
    console.error("Admin analytics error:", error);
    return NextResponse.json({ error: "Failed to generate analytics" }, { status: 500 });
  }
}
