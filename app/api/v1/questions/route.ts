import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { ExamCategoryType, DifficultyLevel, ContentStatus } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const category = searchParams.get("category");
    const subjectId = searchParams.get("subjectId");
    const paperId = searchParams.get("paperId");
    const chapterId = searchParams.get("chapterId");
    const boardId = searchParams.get("boardId");
    const year = searchParams.get("year");
    const difficulty = searchParams.get("difficulty");
    const q = searchParams.get("q");

    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "10", 10)));
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {
      status: ContentStatus.PUBLISHED,
    };

    if (category && Object.values(ExamCategoryType).includes(category as ExamCategoryType)) {
      where.category = category as ExamCategoryType;
    }

    if (subjectId) where.subjectId = subjectId;
    if (paperId) where.paperId = paperId;
    if (chapterId) where.chapterId = chapterId;
    if (difficulty && Object.values(DifficultyLevel).includes(difficulty as DifficultyLevel)) {
      where.difficulty = difficulty as DifficultyLevel;
    }

    if (boardId || year) {
      const refFilter: Record<string, unknown> = {};
      if (boardId) refFilter.boardId = boardId;
      if (year) refFilter.examYear = parseInt(year, 10);
      where.references = { some: refFilter };
    }

    if (q && q.trim().length > 0) {
      where.OR = [
        { questionTextBn: { contains: q.trim(), mode: "insensitive" } },
        { questionTextEn: { contains: q.trim(), mode: "insensitive" } },
      ];
    }

    const [questions, totalCount] = await Promise.all([
      prisma.question.findMany({
        where,
        include: {
          options: {
            orderBy: { orderIndex: "asc" },
          },
          answer: true,
          references: {
            include: {
              board: true,
              university: true,
              admissionUnit: true,
            },
          },
          subject: { select: { id: true, nameBn: true, nameEn: true, code: true } },
          chapter: { select: { id: true, nameBn: true, nameEn: true, chapterNum: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.question.count({ where }),
    ]);

    return NextResponse.json({
      questions,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    console.error("Questions API error:", error);
    return NextResponse.json({ error: "Failed to fetch questions" }, { status: 500 });
  }
}
