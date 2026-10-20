import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { getCurrentUser } from "@/lib/auth/session";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const session = await prisma.examSession.findFirst({
      where: { id, studentId: user.id },
      include: {
        result: true,
        studentAnswers: true,
        sessionQuestions: {
          orderBy: { orderIndex: "asc" },
          include: {
            question: {
              include: {
                options: { orderBy: { orderIndex: "asc" } },
                answer: true,
                subject: true,
                chapter: true,
                references: { include: { board: true, university: true } },
              },
            },
          },
        },
      },
    });

    if (!session || !session.result) {
      return NextResponse.json({ error: "Exam result not available" }, { status: 404 });
    }

    // Parse breakdowns JSON safely
    let subjectBreakdown = {};
    let chapterBreakdown = {};
    try {
      subjectBreakdown = JSON.parse(session.result.subjectBreakdownJson);
      chapterBreakdown = JSON.parse(session.result.chapterBreakdownJson);
    } catch {
      // fallback
    }

    return NextResponse.json({
      session: {
        id: session.id,
        category: session.category,
        mode: session.mode,
        durationMinutes: session.durationMinutes,
        correctMark: session.correctMark,
        negativeMark: session.negativeMark,
        serverStartTime: session.serverStartTime,
        submittedAt: session.submittedAt,
      },
      result: {
        ...session.result,
        subjectBreakdown,
        chapterBreakdown,
      },
      studentAnswers: session.studentAnswers,
      questions: session.sessionQuestions.map((sq) => sq.question),
    });
  } catch (error) {
    console.error("Fetch exam result error:", error);
    return NextResponse.json({ error: "Failed to fetch exam result" }, { status: 500 });
  }
}
