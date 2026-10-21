import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { ExamService } from "@/lib/exams/examService";
import prisma from "@/lib/db/prisma";

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

    const exam = await prisma.exam.findUnique({
      where: { id },
      include: {
        sections: {
          orderBy: { orderIndex: "asc" },
          select: {
            id: true,
            titleBn: true,
            titleEn: true,
            descriptionBn: true,
            descriptionEn: true,
            totalMarks: true,
            durationMinutes: true,
            orderIndex: true,
          },
        },
        academicClass: { select: { nameBn: true, nameEn: true } },
        subject: { select: { nameBn: true, nameEn: true } },
        paper: { select: { nameBn: true, nameEn: true } },
        board: { select: { nameBn: true, nameEn: true } },
        _count: {
          select: {
            examQuestions: true,
            sessions: true,
          },
        },
      },
    });

    if (!exam) {
      return NextResponse.json({ error: "Exam not found" }, { status: 404 });
    }

    // Eligibility check
    const eligibility = await ExamService.checkEligibility(id, user.id);

    return NextResponse.json({
      exam: {
        id: exam.id,
        titleBn: exam.titleBn,
        titleEn: exam.titleEn,
        descriptionBn: exam.descriptionBn,
        descriptionEn: exam.descriptionEn,
        examType: exam.examType,
        category: exam.category,
        status: exam.status,
        accessType: exam.accessType,
        priceBdt: exam.priceBdt,
        totalMarks: exam.totalMarks,
        passMarks: exam.passMarks,
        durationMinutes: exam.durationMinutes,
        negativeMarkRate: exam.negativeMarks,
        marksPerQuestion: exam.questionCount > 0 ? exam.totalMarks / exam.questionCount : 1,
        totalQuestions: exam.questionCount,
        startTime: exam.startDate,
        endTime: exam.endDate,
        maxAttempts: exam.maxAttempts,
        releasePolicy: exam.releasePolicy,
        instructionsBn: exam.instructionsBn,
        instructionsEn: exam.instructionsEn,
        sections: exam.sections,
        academicClass: exam.academicClass,
        subject: exam.subject,
        paper: exam.paper,
        board: exam.board,
      },
      eligibility,
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Exam instructions fetch error:", err);
    return NextResponse.json({ error: err.message || "Failed to fetch exam instructions" }, { status: 500 });
  }
}
