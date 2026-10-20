import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { AnswerSaveSchema } from "@/lib/validation/schemas";
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
    const parsed = AnswerSaveSchema.safeParse({ ...body, sessionId: id });

    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.format() }, { status: 400 });
    }

    const { questionId, selectedOption, timeSpentSec } = parsed.data;

    const answer = await ExamService.saveAnswer(
      id,
      user.id,
      questionId,
      selectedOption,
      timeSpentSec
    );

    return NextResponse.json({ success: true, answer });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Autosave answer error:", err);
    return NextResponse.json({ error: err.message || "Failed to save answer" }, { status: 400 });
  }
}
