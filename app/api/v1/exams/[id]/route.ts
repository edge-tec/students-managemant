import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import { ExamService } from "@/lib/exams/examService";
import { ExamSessionStatus } from "@prisma/client";

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
        exam: {
          include: {
            sections: { orderBy: { orderIndex: "asc" } },
          },
        },
        sessionQuestions: {
          orderBy: { orderIndex: "asc" },
          include: {
            question: {
              include: {
                options: {
                  orderBy: { orderIndex: "asc" },
                  select: {
                    id: true,
                    optionKey: true,
                    textBn: true,
                    textEn: true,
                    // isCorrect omitted during active exam
                  },
                },
                subject: { select: { nameBn: true, nameEn: true } },
                chapter: { select: { nameBn: true, nameEn: true, chapterNum: true } },
                references: {
                  include: { board: true, university: true },
                },
              },
            },
          },
        },
        studentAnswers: true,
        result: true,
      },
    });

    if (!session) {
      return NextResponse.json({ error: "Exam session not found" }, { status: 404 });
    }

    // Check if exam deadline expired on the server
    const now = new Date();
    const isExpired = now.getTime() > new Date(session.serverDeadline).getTime();
    if (isExpired && session.status === ExamSessionStatus.IN_PROGRESS) {
      // Auto-finalize and evaluate expired attempt
      try {
        const evalRes = await ExamService.submitAndEvaluateExam({
          sessionId: session.id,
          studentId: user.id,
          answers: [],
          finalizationReason: "TIMEOUT_AUTO_SUBMIT",
        });
        session.status = ExamSessionStatus.EVALUATED;
        session.result = evalRes.result as any;
      } catch (err) {
        await prisma.examSession.update({
          where: { id: session.id },
          data: { status: ExamSessionStatus.EXPIRED },
        });
        session.status = ExamSessionStatus.EXPIRED;
      }
    }

    return NextResponse.json({ session });
  } catch (error) {
    console.error("Fetch exam session error:", error);
    return NextResponse.json({ error: "Failed to fetch exam session" }, { status: 500 });
  }
}
