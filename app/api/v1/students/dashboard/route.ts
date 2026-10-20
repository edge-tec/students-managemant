import { NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { getCurrentUser } from "@/lib/auth/session";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [
      student,
      streak,
      recentResults,
      wrongQuestionsCount,
      bookmarksCount,
      todayTarget,
      activeSubscription,
    ] = await Promise.all([
      prisma.user.findUnique({
        where: { id: user.id },
        select: {
          id: true,
          fullName: true,
          fullNameBn: true,
          email: true,
          profile: true,
          preferences: true,
        },
      }),
      prisma.studyStreak.findUnique({
        where: { studentId: user.id },
      }),
      prisma.examResult.findMany({
        where: { studentId: user.id },
        include: {
          session: {
            select: {
              category: true,
              mode: true,
              serverStartTime: true,
              totalQuestions: true,
            },
          },
        },
        orderBy: { evaluatedAt: "desc" },
        take: 5,
      }),
      prisma.wrongQuestion.count({
        where: { studentId: user.id, isMastered: false },
      }),
      prisma.bookmark.count({
        where: { studentId: user.id },
      }),
      prisma.studyTarget.findFirst({
        where: { studentId: user.id },
        orderBy: { targetDate: "desc" },
      }),
      prisma.subscription.findFirst({
        where: { studentId: user.id, status: "ACTIVE" },
        include: { plan: true },
        orderBy: { endDate: "desc" },
      }),
    ]);

    // Calculate total questions solved from all completed exam results
    const totalSolvedAgg = await prisma.examResult.aggregate({
      where: { studentId: user.id },
      _sum: {
        correctCount: true,
        incorrectCount: true,
      },
    });

    const totalQuestionsSolved =
      (totalSolvedAgg._sum.correctCount || 0) + (totalSolvedAgg._sum.incorrectCount || 0);

    return NextResponse.json({
      student,
      streak: streak || { currentStreak: 1, longestStreak: 1 },
      todayTarget: todayTarget || { targetQuestions: 20, completedQuestions: Math.min(20, totalQuestionsSolved % 20), isCompleted: false },
      recentResults,
      stats: {
        totalQuestionsSolved,
        wrongQuestionsCount,
        bookmarksCount,
      },
      activeSubscription,
    });
  } catch (error) {
    console.error("Student dashboard API error:", error);
    return NextResponse.json({ error: "Failed to fetch student dashboard" }, { status: 500 });
  }
}
