import { NextRequest, NextResponse } from "next/server";
import { ExamService } from "@/lib/exams/examService";
import { ExamCategoryType } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const templateId = searchParams.get("templateId") || undefined;
    const categoryParam = searchParams.get("category");
    const category = categoryParam && Object.values(ExamCategoryType).includes(categoryParam as ExamCategoryType)
      ? (categoryParam as ExamCategoryType)
      : undefined;

    const limitParam = searchParams.get("limit");
    const limit = limitParam ? Math.min(50, Math.max(1, parseInt(limitParam, 10))) : 10;

    const leaderboard = await ExamService.getExamLeaderboard({
      templateId,
      category,
      limit,
    });

    return NextResponse.json({
      leaderboard,
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Leaderboard fetch error:", err);
    return NextResponse.json({ error: err.message || "Failed to fetch leaderboard" }, { status: 500 });
  }
}
