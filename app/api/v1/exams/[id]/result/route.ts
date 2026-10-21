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
    let sectionBreakdown = {};
    try {
      subjectBreakdown = JSON.parse(session.result.subjectBreakdownJson);
      chapterBreakdown = JSON.parse(session.result.chapterBreakdownJson);
      if (session.result.sectionBreakdownJson) {
        sectionBreakdown = JSON.parse(session.result.sectionBreakdownJson);
      }
    } catch {
      // fallback
    }

    const isReleased = session.result.isPublished;

    // Mask questions and answers if results are not yet released
    const questions = session.sessionQuestions.map((sq) => {
      const q = sq.question;
      if (!isReleased) {
        return {
          id: q.id,
          questionTextBn: q.questionTextBn,
          questionTextEn: q.questionTextEn,
          marks: q.marks,
          options: q.options.map((opt) => ({
            id: opt.id,
            optionKey: opt.optionKey,
            textBn: opt.textBn,
            textEn: opt.textEn,
            isCorrect: false, // masked
          })),
          answer: null, // masked
          subject: q.subject,
          chapter: q.chapter,
          references: q.references,
        };
      }
      return q;
    });

    const studentAnswers = session.studentAnswers.map((sa) => {
      if (!isReleased) {
        return {
          id: sa.id,
          questionId: sa.questionId,
          selectedOption: sa.selectedOption,
          writtenAnswer: sa.writtenAnswer,
          isMarkedForReview: sa.isMarkedForReview,
          isCorrect: null, // masked
          marksObtained: null, // masked
        };
      }
      return sa;
    });

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
        attemptNumber: session.attemptNumber,
      },
      result: {
        ...session.result,
        totalScore: isReleased ? session.result.totalScore : null,
        accuracyPct: isReleased ? session.result.accuracyPct : null,
        rankInCohort: isReleased ? session.result.rankInCohort : null,
        percentile: isReleased ? session.result.percentile : null,
        subjectBreakdown: isReleased ? subjectBreakdown : {},
        chapterBreakdown: isReleased ? chapterBreakdown : {},
        sectionBreakdown: isReleased ? sectionBreakdown : {},
        isReleased,
      },
      studentAnswers,
      questions,
    });
  } catch (error) {
    console.error("Fetch exam result error:", error);
    return NextResponse.json({ error: "Failed to fetch exam result" }, { status: 500 });
  }
}
