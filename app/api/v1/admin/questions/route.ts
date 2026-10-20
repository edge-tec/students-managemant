import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import { isContentStaff } from "@/lib/auth/rbac";
import { CreateQuestionSchema } from "@/lib/validation/schemas";
import { ContentStatus, DifficultyLevel, ExamCategoryType, QuestionType } from "@prisma/client";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || !isContentStaff(user)) {
      return NextResponse.json({ error: "Unauthorized: Content staff only" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = CreateQuestionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.format() }, { status: 400 });
    }

    const data = parsed.data;

    const question = await prisma.question.create({
      data: {
        category: data.category as ExamCategoryType,
        subjectId: data.subjectId,
        paperId: data.paperId || null,
        chapterId: data.chapterId,
        topicId: data.topicId || null,
        type: data.type as QuestionType,
        difficulty: data.difficulty as DifficultyLevel,
        status: ContentStatus.PUBLISHED,
        questionTextBn: data.questionTextBn,
        questionTextEn: data.questionTextEn || null,
        marks: data.marks,
        negativeMarks: data.negativeMarks,
        estimatedSeconds: data.estimatedSeconds,
        textbookRef: data.textbookRef || null,
        teacherTipsBn: data.teacherTipsBn || null,
        authorId: user.id,
        options: {
          create: data.options.map((opt, idx) => ({
            optionKey: opt.optionKey,
            textBn: opt.textBn,
            textEn: opt.textEn || null,
            isCorrect: opt.isCorrect,
            orderIndex: idx + 1,
          })),
        },
        answer: {
          create: {
            correctKey: data.correctKey,
            explanationBn: data.explanationBn,
            explanationEn: data.explanationEn || null,
          },
        },
      },
      include: {
        options: true,
        answer: true,
      },
    });

    return NextResponse.json({ message: "Question created successfully", question }, { status: 201 });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Create question error:", err);
    return NextResponse.json({ error: err.message || "Failed to create question" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || !isContentStaff(user)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json();
    const { questionId, status, comments } = body;

    if (!questionId || !status) {
      return NextResponse.json({ error: "questionId and status are required" }, { status: 400 });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const q = await tx.question.update({
        where: { id: questionId },
        data: { status: status as ContentStatus },
      });

      await tx.contentReview.create({
        data: {
          questionId,
          reviewerId: user.id,
          status: status as ContentStatus,
          comments: comments || null,
        },
      });

      return q;
    });

    return NextResponse.json({ success: true, question: updated });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Update question status error:", err);
    return NextResponse.json({ error: err.message || "Failed to update question status" }, { status: 500 });
  }
}
