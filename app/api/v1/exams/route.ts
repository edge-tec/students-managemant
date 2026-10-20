import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { ExamService } from "@/lib/exams/examService";
import { ExamCategoryType } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    const { searchParams } = new URL(req.url);

    const categoryParam = searchParams.get("category");
    const category = categoryParam && Object.values(ExamCategoryType).includes(categoryParam as ExamCategoryType)
      ? (categoryParam as ExamCategoryType)
      : undefined;

    const templates = await ExamService.listExamTemplates({
      category,
      studentId: user?.id,
    });

    const history = user?.id
      ? await ExamService.getStudentExamHistory(user.id, 10)
      : [];

    return NextResponse.json({
      templates,
      history,
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("List exams error:", err);
    return NextResponse.json({ error: err.message || "Failed to list exams" }, { status: 500 });
  }
}
