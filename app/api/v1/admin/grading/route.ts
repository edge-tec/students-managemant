import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { isExamStaff } from "@/lib/auth/rbac";
import { ExamService } from "@/lib/exams/examService";
import { ManualGradeInputSchema } from "@/lib/validation/schemas";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || !isExamStaff(user)) {
      return NextResponse.json({ error: "Unauthorized: Exam staff only" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const examId = searchParams.get("examId") || undefined;
    const status = (searchParams.get("status") as "PENDING" | "GRADED") || undefined;
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));

    const queue = await ExamService.getManualGradingQueue({
      examId,
      status,
      page,
      limit,
    });

    return NextResponse.json(queue);
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Manual grading queue fetch error:", err);
    return NextResponse.json({ error: err.message || "Failed to fetch grading queue" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || !isExamStaff(user)) {
      return NextResponse.json({ error: "Unauthorized: Exam staff only" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = ManualGradeInputSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const grade = await ExamService.gradeSubjectiveAnswer({
      ...parsed.data,
      graderId: user.id,
    });

    return NextResponse.json({ message: "Graded successfully", grade });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Manual grading submission error:", err);
    return NextResponse.json({ error: err.message || "Failed to save grade" }, { status: 400 });
  }
}
