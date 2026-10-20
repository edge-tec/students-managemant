import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { ExamSubmitSchema } from "@/lib/validation/schemas";
import { ExamService } from "@/lib/exams/examService";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = ExamSubmitSchema.safeParse({ ...body, sessionId: id });

    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.format() }, { status: 400 });
    }

    const evaluation = await ExamService.submitAndEvaluateExam({
      sessionId: id,
      studentId: user.id,
      answers: parsed.data.answers,
    });

    return NextResponse.json({
      message: "Exam submitted and evaluated successfully",
      result: evaluation.result,
      alreadyEvaluated: evaluation.alreadyEvaluated,
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Exam submission error:", err);
    return NextResponse.json({ error: err.message || "Failed to evaluate exam" }, { status: 400 });
  }
}
