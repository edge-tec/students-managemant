import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
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

    const session = await ExamService.startExamAttempt(id, user.id);
    if (!session) {
      return NextResponse.json({ error: "Failed to initialize exam session" }, { status: 400 });
    }

    return NextResponse.json({
      message: "Exam attempt started",
      session: {
        id: session.id,
        status: session.status,
        durationMinutes: session.durationMinutes,
        serverStartTime: session.serverStartTime,
        serverDeadline: session.serverDeadline,
        attemptNumber: session.attemptNumber,
      },
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Start exam error:", err);
    return NextResponse.json({ error: err.message || "Failed to start exam" }, { status: 400 });
  }
}
