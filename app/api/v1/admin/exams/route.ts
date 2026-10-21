import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { isExamStaff } from "@/lib/auth/rbac";
import { ExamService } from "@/lib/exams/examService";
import { AdminExamCreateSchema } from "@/lib/validation/schemas";
import { ExamCategoryType, ExamStatus, ExamType } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || !isExamStaff(user)) {
      return NextResponse.json({ error: "Unauthorized: Exam staff only" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);

    const categoryParam = searchParams.get("category");
    const category = categoryParam && Object.values(ExamCategoryType).includes(categoryParam as ExamCategoryType)
      ? (categoryParam as ExamCategoryType)
      : undefined;

    const statusParam = searchParams.get("status");
    const status = statusParam && Object.values(ExamStatus).includes(statusParam as ExamStatus)
      ? (statusParam as ExamStatus)
      : undefined;

    const examTypeParam = searchParams.get("examType");
    const examType = examTypeParam && Object.values(ExamType).includes(examTypeParam as ExamType)
      ? (examTypeParam as ExamType)
      : undefined;

    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
    const search = searchParams.get("q") || searchParams.get("search") || undefined;

    const result = await ExamService.listAdminExams({
      category,
      status,
      examType,
      search,
      page,
      limit,
    });

    return NextResponse.json(result);
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Admin list exams error:", err);
    return NextResponse.json({ error: err.message || "Failed to list exams" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || !isExamStaff(user)) {
      return NextResponse.json({ error: "Unauthorized: Exam staff only" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = AdminExamCreateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const exam = await ExamService.createAdminExam(parsed.data, user.id);

    return NextResponse.json(
      { message: "Exam created successfully", exam },
      { status: 201 }
    );
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Admin create exam error:", err);
    return NextResponse.json({ error: err.message || "Failed to create exam" }, { status: 400 });
  }
}
