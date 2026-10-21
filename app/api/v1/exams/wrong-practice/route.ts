import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { ExamService } from "@/lib/exams/examService";
import { WrongPracticeCreateSchema } from "@/lib/validation/schemas";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const parsed = WrongPracticeCreateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const session = await ExamService.createWrongAnswerPracticeSession({
      studentId: user.id,
      ...parsed.data,
    });

    return NextResponse.json({
      message: "Wrong-answer practice session created",
      sessionId: session.id,
      totalQuestions: session.totalQuestions,
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Create wrong answer practice session error:", err);
    return NextResponse.json({ error: err.message || "Failed to create practice session" }, { status: 400 });
  }
}
