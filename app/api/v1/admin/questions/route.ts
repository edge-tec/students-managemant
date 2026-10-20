import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { isContentStaff } from "@/lib/auth/rbac";
import { QuestionService, CreateQuestionInput, QuestionListFilters } from "@/lib/questions/questionService";
import { ContentStatus, DifficultyLevel, ExamCategoryType, QuestionType } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || !isContentStaff(user)) {
      return NextResponse.json({ error: "Unauthorized: Content staff only" }, { status: 403 });
    }

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
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
    const search = searchParams.get("q") || searchParams.get("search") || undefined;

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
    };

    const result = await QuestionService.listQuestions(filters, user.id, true);

    return NextResponse.json(result);
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Admin list questions error:", err);
    return NextResponse.json({ error: err.message || "Failed to list questions" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || !isContentStaff(user)) {
      return NextResponse.json({ error: "Unauthorized: Content staff only" }, { status: 403 });
    }

    const body = await req.json();

    // Basic structure validation
    if (!body.category || !body.subjectId || !body.chapterId || !body.questionTextBn) {
      return NextResponse.json(
        { error: "Category, subjectId, chapterId, and questionTextBn are required." },
        { status: 400 }
      );
    }

    const input: CreateQuestionInput = {
      category: body.category as ExamCategoryType,
      subjectId: body.subjectId,
      paperId: body.paperId || null,
      chapterId: body.chapterId,
      topicId: body.topicId || null,
      type: (body.type as QuestionType) || QuestionType.MCQ,
      difficulty: (body.difficulty as DifficultyLevel) || DifficultyLevel.MEDIUM,
      status: (body.status as ContentStatus) || ContentStatus.DRAFT,
      isPremium: Boolean(body.isPremium),
      questionTextBn: body.questionTextBn.trim(),
      questionTextEn: body.questionTextEn?.trim() || null,
      stemBn: body.stemBn?.trim() || null,
      stemEn: body.stemEn?.trim() || null,
      diagramUrl: body.diagramUrl || null,
      marks: typeof body.marks === "number" ? body.marks : undefined,
      negativeMarks: typeof body.negativeMarks === "number" ? body.negativeMarks : undefined,
      estimatedSeconds: typeof body.estimatedSeconds === "number" ? body.estimatedSeconds : undefined,
      textbookRef: body.textbookRef || null,
      teacherTipsBn: body.teacherTipsBn || null,
      teacherTipsEn: body.teacherTipsEn || null,
      options: body.options,
      subparts: body.subparts,
      answer: body.answer,
      references: body.references,
      tags: body.tags,
    };

    const question = await QuestionService.createQuestion(input, user.id);

    return NextResponse.json({ success: true, question }, { status: 201 });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Admin create question error:", err);
    return NextResponse.json({ error: err.message || "Failed to create question" }, { status: 400 });
  }
}
