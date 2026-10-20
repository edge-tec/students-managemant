import { NextRequest, NextResponse } from "next/server";
import { QuestionService, QuestionListFilters } from "@/lib/questions/questionService";
import { getCurrentUser } from "@/lib/auth/session";
import { isContentStaff } from "@/lib/auth/rbac";
import { ExamCategoryType, DifficultyLevel, QuestionType, ContentStatus } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const categoryParam = searchParams.get("category");
    const category = categoryParam && Object.values(ExamCategoryType).includes(categoryParam as ExamCategoryType)
      ? (categoryParam as ExamCategoryType)
      : undefined;

    const difficultyParam = searchParams.get("difficulty");
    const difficulty = difficultyParam && Object.values(DifficultyLevel).includes(difficultyParam as DifficultyLevel)
      ? (difficultyParam as DifficultyLevel)
      : undefined;

    const typeParam = searchParams.get("type");
    const type = typeParam && Object.values(QuestionType).includes(typeParam as QuestionType)
      ? (typeParam as QuestionType)
      : undefined;

    const statusParam = searchParams.get("status");
    const status = statusParam && Object.values(ContentStatus).includes(statusParam as ContentStatus)
      ? (statusParam as ContentStatus)
      : undefined;

    const examYearParam = searchParams.get("year") || searchParams.get("examYear");
    const examYear = examYearParam ? parseInt(examYearParam, 10) : undefined;

    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "10", 10)));
    const search = searchParams.get("q") || searchParams.get("search") || undefined;

    const sortByParam = searchParams.get("sortBy");
    const sortBy = (sortByParam === "difficulty" || sortByParam === "marks" ? sortByParam : "createdAt") as "createdAt" | "difficulty" | "marks";
    const sortOrder = searchParams.get("sortOrder") === "asc" ? "asc" : "desc";

    const user = await getCurrentUser();
    const staff = isContentStaff(user);

    const filters: QuestionListFilters = {
      category,
      subjectId: searchParams.get("subjectId") || undefined,
      paperId: searchParams.get("paperId") || undefined,
      chapterId: searchParams.get("chapterId") || undefined,
      topicId: searchParams.get("topicId") || undefined,
      boardId: searchParams.get("boardId") || undefined,
      examYear,
      difficulty,
      type,
      status,
      search,
      page,
      limit,
      sortBy,
      sortOrder,
    };

    const result = await QuestionService.listQuestions(filters, user?.id, staff);

    return NextResponse.json(result);
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Questions list API error:", err);
    return NextResponse.json({ error: err.message || "Failed to fetch questions" }, { status: 500 });
  }
}
