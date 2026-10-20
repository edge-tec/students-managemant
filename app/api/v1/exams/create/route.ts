import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { CustomExamCreateSchema } from "@/lib/validation/schemas";
import { ExamService } from "@/lib/exams/examService";
import { ExamCategoryType, ExamMode } from "@prisma/client";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Please log in to create an exam session" }, { status: 401 });
    }

    const body = await req.json();

    // 1. Template-based Exam Session (Model Tests & Past Board Papers)
    if (body.templateId) {
      const session = await ExamService.createExamFromTemplate(body.templateId, user.id);
      return NextResponse.json({
        message: "Exam session created successfully from template",
        sessionId: session.id,
        session,
      }, { status: 201 });
    }

    // 2. Custom & Adaptive Exam Session
    const parsed = CustomExamCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.format() }, { status: 400 });
    }

    const data = parsed.data;

    const session = await ExamService.createCustomExam({
      studentId: user.id,
      category: data.category as ExamCategoryType,
      subjectId: data.subjectId,
      paperId: data.paperId,
      chapterIds: data.chapterIds,
      questionCount: data.questionCount,
      durationMinutes: data.durationMinutes,
      difficulty: data.difficulty,
      mode: data.mode as ExamMode,
      adaptive: data.adaptive,
    });

    return NextResponse.json({
      message: "Exam session created successfully",
      sessionId: session.id,
      session,
    }, { status: 201 });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Exam create error:", err);
    return NextResponse.json({ error: err.message || "Failed to create exam session" }, { status: 400 });
  }
}
