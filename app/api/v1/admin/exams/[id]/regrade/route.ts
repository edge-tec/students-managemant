import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { isExamStaff } from "@/lib/auth/rbac";
import { ExamService } from "@/lib/exams/examService";
import { RegradeExamInputSchema } from "@/lib/validation/schemas";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user || !isExamStaff(user)) {
      return NextResponse.json({ error: "Unauthorized: Exam staff only" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const parsed = RegradeExamInputSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const updatedResult = await ExamService.regradeExamSession({
      sessionId: parsed.data.sessionId,
      graderId: user.id,
      reason: parsed.data.reason,
    });

    return NextResponse.json({
      message: "Exam session regraded successfully",
      result: updatedResult,
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Regrade error:", err);
    return NextResponse.json({ error: err.message || "Failed to regrade exam session" }, { status: 400 });
  }
}
