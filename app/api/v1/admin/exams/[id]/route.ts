import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { isExamStaff } from "@/lib/auth/rbac";
import { ExamService } from "@/lib/exams/examService";
import { AdminExamUpdateSchema } from "@/lib/validation/schemas";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user || !isExamStaff(user)) {
      return NextResponse.json({ error: "Unauthorized: Exam staff only" }, { status: 403 });
    }

    const { id } = await params;
    const exam = await ExamService.getAdminExamDetail(id);

    if (!exam) {
      return NextResponse.json({ error: "Exam not found" }, { status: 404 });
    }

    return NextResponse.json({ exam });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Admin get exam error:", err);
    return NextResponse.json({ error: err.message || "Failed to fetch exam" }, { status: 500 });
  }
}

export async function PUT(
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
    const parsed = AdminExamUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const updated = await ExamService.updateAdminExam(id, parsed.data, user.id);

    return NextResponse.json({ message: "Exam updated successfully", exam: updated });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Admin update exam error:", err);
    return NextResponse.json({ error: err.message || "Failed to update exam" }, { status: 400 });
  }
}

export async function PATCH(
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
    const action = body.action;

    if (action === "publish") {
      const published = await ExamService.publishAdminExam(id, user.id);
      return NextResponse.json({ message: "Exam published successfully", exam: published });
    } else if (action === "archive") {
      const archived = await ExamService.archiveAdminExam(id, user.id);
      return NextResponse.json({ message: "Exam archived successfully", exam: archived });
    } else {
      return NextResponse.json({ error: `Unsupported action: ${action}` }, { status: 400 });
    }
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Admin exam action error:", err);
    return NextResponse.json({ error: err.message || "Failed to perform exam action" }, { status: 400 });
  }
}
