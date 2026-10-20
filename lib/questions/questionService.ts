import prisma from "@/lib/db/prisma";
import {
  QuestionType,
  DifficultyLevel,
  ContentStatus,
  ExamCategoryType,
  ReportReason,
  ReportStatus,
} from "@prisma/client";

export interface CreateQuestionInput {
  category: ExamCategoryType;
  subjectId: string;
  paperId?: string | null;
  chapterId: string;
  topicId?: string | null;
  type?: QuestionType;
  difficulty?: DifficultyLevel;
  status?: ContentStatus;
  isPremium?: boolean;
  questionTextBn: string;
  questionTextEn?: string | null;
  stemBn?: string | null;
  stemEn?: string | null;
  diagramUrl?: string | null;
  marks?: number;
  negativeMarks?: number;
  estimatedSeconds?: number;
  textbookRef?: string | null;
  teacherTipsBn?: string | null;
  teacherTipsEn?: string | null;
  options?: {
    optionKey: string;
    textBn: string;
    textEn?: string | null;
    isCorrect: boolean;
  }[];
  subparts?: {
    partLabel: string;
    questionTextBn: string;
    questionTextEn?: string | null;
    marks: number;
    solutionBn: string;
    solutionEn?: string | null;
    markingGuidance?: string | null;
  }[];
  answer?: {
    correctKey: string;
    explanationBn: string;
    explanationEn?: string | null;
  };
  references?: {
    boardId?: string | null;
    universityId?: string | null;
    admissionUnitId?: string | null;
    examYear: number;
    examSessionName?: string | null;
  }[];
  tags?: string[];
}

export interface QuestionListFilters {
  category?: ExamCategoryType;
  classId?: string;
  subjectId?: string;
  paperId?: string;
  chapterId?: string;
  topicId?: string;
  boardId?: string;
  examYear?: number;
  difficulty?: DifficultyLevel;
  type?: QuestionType;
  status?: ContentStatus;
  isPremium?: boolean;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: "createdAt" | "difficulty" | "marks";
  sortOrder?: "asc" | "desc";
}

export class QuestionService {
  /**
   * Creates a new Question with options (for MCQ), subparts (for CQ), and answers.
   */
  static async createQuestion(input: CreateQuestionInput, authorId?: string) {
    // Validate MCQ requirements
    if (input.type === QuestionType.MCQ || !input.type) {
      if (!input.options || input.options.length < 2) {
        throw new Error("MCQ questions require at least 2 options (A, B, C, D).");
      }
      const hasCorrect = input.options.some((o) => o.isCorrect);
      if (!hasCorrect && !input.answer?.correctKey) {
        throw new Error("MCQ questions must specify at least one correct option.");
      }
    }

    // Validate CQ requirements
    if (input.type === QuestionType.CQ) {
      if (!input.subparts || input.subparts.length === 0) {
        throw new Error("Creative Questions (CQ) require subparts (e.g. ক, খ, গ, ঘ).");
      }
    }

    return prisma.$transaction(async (tx) => {
      const question = await tx.question.create({
        data: {
          category: input.category,
          subjectId: input.subjectId,
          paperId: input.paperId || null,
          chapterId: input.chapterId,
          topicId: input.topicId || null,
          type: input.type ?? QuestionType.MCQ,
          difficulty: input.difficulty ?? DifficultyLevel.MEDIUM,
          status: input.status ?? ContentStatus.DRAFT,
          isPremium: input.isPremium ?? false,
          questionTextBn: input.questionTextBn,
          questionTextEn: input.questionTextEn || null,
          stemBn: input.stemBn || null,
          stemEn: input.stemEn || null,
          diagramUrl: input.diagramUrl || null,
          marks: input.marks ?? (input.type === QuestionType.CQ ? 10.0 : 1.0),
          negativeMarks: input.negativeMarks ?? 0.25,
          estimatedSeconds: input.estimatedSeconds ?? (input.type === QuestionType.CQ ? 1200 : 60),
          textbookRef: input.textbookRef || null,
          teacherTipsBn: input.teacherTipsBn || null,
          teacherTipsEn: input.teacherTipsEn || null,
          authorId: authorId || null,
        },
      });

      // Insert options for MCQ
      if (input.options && input.options.length > 0) {
        await tx.questionOption.createMany({
          data: input.options.map((opt, idx) => ({
            questionId: question.id,
            optionKey: opt.optionKey,
            textBn: opt.textBn,
            textEn: opt.textEn || null,
            isCorrect: opt.isCorrect,
            orderIndex: idx + 1,
          })),
        });
      }

      // Insert subparts for CQ
      if (input.subparts && input.subparts.length > 0) {
        await tx.questionSubpart.createMany({
          data: input.subparts.map((sp, idx) => ({
            questionId: question.id,
            partLabel: sp.partLabel,
            questionTextBn: sp.questionTextBn,
            questionTextEn: sp.questionTextEn || null,
            marks: sp.marks,
            solutionBn: sp.solutionBn,
            solutionEn: sp.solutionEn || null,
            markingGuidance: sp.markingGuidance || null,
            orderIndex: idx + 1,
          })),
        });
      }

      // Insert Answer
      if (input.answer) {
        await tx.questionAnswer.create({
          data: {
            questionId: question.id,
            correctKey: input.answer.correctKey,
            explanationBn: input.answer.explanationBn,
            explanationEn: input.answer.explanationEn || null,
          },
        });
      }

      // Insert References (Board / University past papers)
      if (input.references && input.references.length > 0) {
        await tx.questionReference.createMany({
          data: input.references.map((ref) => ({
            questionId: question.id,
            boardId: ref.boardId || null,
            universityId: ref.universityId || null,
            admissionUnitId: ref.admissionUnitId || null,
            examYear: ref.examYear,
            examSessionName: ref.examSessionName || null,
          })),
        });
      }

      // Insert Tags
      if (input.tags && input.tags.length > 0) {
        await tx.questionTag.createMany({
          data: input.tags.map((tag) => ({
            questionId: question.id,
            tag: tag.trim(),
          })),
        });
      }

      // Create initial revision entry
      await tx.questionRevision.create({
        data: {
          questionId: question.id,
          changedBy: authorId || "SYSTEM",
          diffJson: JSON.stringify({ action: "CREATE", initial: input }),
          reason: "Initial question creation",
        },
      });

      return question;
    });
  }

  /**
   * Updates an existing question and logs the revision diff.
   */
  static async updateQuestion(
    id: string,
    input: Partial<CreateQuestionInput>,
    changedById: string,
    reason?: string
  ) {
    const existing = await prisma.question.findUnique({
      where: { id },
      include: { options: true, answer: true, subparts: true },
    });

    if (!existing) {
      throw new Error("Question not found");
    }

    return prisma.$transaction(async (tx) => {
      // 1. Update main question fields
      const updated = await tx.question.update({
        where: { id },
        data: {
          ...(input.category ? { category: input.category } : {}),
          ...(input.subjectId ? { subjectId: input.subjectId } : {}),
          ...(input.paperId !== undefined ? { paperId: input.paperId } : {}),
          ...(input.chapterId ? { chapterId: input.chapterId } : {}),
          ...(input.topicId !== undefined ? { topicId: input.topicId } : {}),
          ...(input.type ? { type: input.type } : {}),
          ...(input.difficulty ? { difficulty: input.difficulty } : {}),
          ...(input.status ? { status: input.status } : {}),
          ...(input.isPremium !== undefined ? { isPremium: input.isPremium } : {}),
          ...(input.questionTextBn ? { questionTextBn: input.questionTextBn } : {}),
          ...(input.questionTextEn !== undefined ? { questionTextEn: input.questionTextEn } : {}),
          ...(input.stemBn !== undefined ? { stemBn: input.stemBn } : {}),
          ...(input.stemEn !== undefined ? { stemEn: input.stemEn } : {}),
          ...(input.diagramUrl !== undefined ? { diagramUrl: input.diagramUrl } : {}),
          ...(input.marks !== undefined ? { marks: input.marks } : {}),
          ...(input.negativeMarks !== undefined ? { negativeMarks: input.negativeMarks } : {}),
          ...(input.estimatedSeconds !== undefined ? { estimatedSeconds: input.estimatedSeconds } : {}),
          ...(input.textbookRef !== undefined ? { textbookRef: input.textbookRef } : {}),
          ...(input.teacherTipsBn !== undefined ? { teacherTipsBn: input.teacherTipsBn } : {}),
          ...(input.teacherTipsEn !== undefined ? { teacherTipsEn: input.teacherTipsEn } : {}),
        },
      });

      // 2. Options replacement if provided
      if (input.options && input.options.length > 0) {
        await tx.questionOption.deleteMany({ where: { questionId: id } });
        await tx.questionOption.createMany({
          data: input.options.map((opt, idx) => ({
            questionId: id,
            optionKey: opt.optionKey,
            textBn: opt.textBn,
            textEn: opt.textEn || null,
            isCorrect: opt.isCorrect,
            orderIndex: idx + 1,
          })),
        });
      }

      // 3. Subparts replacement if provided
      if (input.subparts) {
        await tx.questionSubpart.deleteMany({ where: { questionId: id } });
        if (input.subparts.length > 0) {
          await tx.questionSubpart.createMany({
            data: input.subparts.map((sp, idx) => ({
              questionId: id,
              partLabel: sp.partLabel,
              questionTextBn: sp.questionTextBn,
              questionTextEn: sp.questionTextEn || null,
              marks: sp.marks,
              solutionBn: sp.solutionBn,
              solutionEn: sp.solutionEn || null,
              markingGuidance: sp.markingGuidance || null,
              orderIndex: idx + 1,
            })),
          });
        }
      }

      // 4. Answer update
      if (input.answer) {
        await tx.questionAnswer.upsert({
          where: { questionId: id },
          update: {
            correctKey: input.answer.correctKey,
            explanationBn: input.answer.explanationBn,
            explanationEn: input.answer.explanationEn || null,
          },
          create: {
            questionId: id,
            correctKey: input.answer.correctKey,
            explanationBn: input.answer.explanationBn,
            explanationEn: input.answer.explanationEn || null,
          },
        });
      }

      // 5. Log revision diff
      await tx.questionRevision.create({
        data: {
          questionId: id,
          changedBy: changedById,
          diffJson: JSON.stringify({
            before: {
              textBn: existing.questionTextBn,
              difficulty: existing.difficulty,
              status: existing.status,
              isPremium: existing.isPremium,
            },
            after: input,
          }),
          reason: reason || "Question updated via management interface",
        },
      });

      return updated;
    });
  }

  /**
   * Updates question status (DRAFT -> REVIEW -> APPROVED -> PUBLISHED -> ARCHIVED)
   */
  static async updateStatus(
    id: string,
    status: ContentStatus,
    reviewerId: string,
    comments?: string
  ) {
    return prisma.$transaction(async (tx) => {
      const question = await tx.question.update({
        where: { id },
        data: { status },
      });

      await tx.contentReview.create({
        data: {
          questionId: id,
          reviewerId,
          status,
          comments: comments || `Status changed to ${status}`,
        },
      });

      await tx.questionRevision.create({
        data: {
          questionId: id,
          changedBy: reviewerId,
          diffJson: JSON.stringify({ action: "STATUS_CHANGE", newStatus: status, comments }),
          reason: comments || `Status updated to ${status}`,
        },
      });

      return question;
    });
  }

  /**
   * Retrieves single question by ID with strict premium protection.
   */
  static async getQuestionById(id: string, userId?: string, isStaff = false) {
    const question = await prisma.question.findUnique({
      where: { id },
      include: {
        subject: { select: { id: true, code: true, nameBn: true, nameEn: true, category: true } },
        paper: { select: { id: true, paperNumber: true, nameBn: true, nameEn: true } },
        chapter: { select: { id: true, chapterNum: true, nameBn: true, nameEn: true } },
        topic: { select: { id: true, nameBn: true, nameEn: true } },
        options: { orderBy: { orderIndex: "asc" } },
        subparts: { orderBy: { orderIndex: "asc" } },
        answer: true,
        references: {
          include: { board: true, university: true, admissionUnit: true },
        },
        tags: true,
        revisions: isStaff ? { orderBy: { createdAt: "desc" }, take: 10 } : false,
        reviews: isStaff ? { orderBy: { reviewedAt: "desc" }, include: { reviewer: { select: { fullName: true } } } } : false,
      },
    });

    if (!question) return null;

    // Non-staff can only see PUBLISHED questions
    if (!isStaff && question.status !== ContentStatus.PUBLISHED) {
      return null;
    }

    // Check premium authorization
    let hasPremiumAccess = isStaff;
    let isBookmarked = false;

    if (userId) {
      if (!hasPremiumAccess && question.isPremium) {
        const sub = await prisma.subscription.findFirst({
          where: {
            studentId: userId,
            status: "ACTIVE",
            endDate: { gte: new Date() },
          },
        });
        hasPremiumAccess = Boolean(sub);
      }

      const bm = await prisma.bookmark.findUnique({
        where: { studentId_questionId: { studentId: userId, questionId: id } },
      });
      isBookmarked = Boolean(bm);
    }

    // Secure payload: Protect answer and explanation if unauthorized
    if (question.isPremium && !hasPremiumAccess) {
      return {
        ...question,
        answer: null,
        options: question.options.map((opt) => ({
          ...opt,
          isCorrect: false, // Mask correct key
        })),
        subparts: question.subparts.map((sp) => ({
          ...sp,
          solutionBn: "এই প্রশ্নের পূর্ণাঙ্গ সমাধান দেখতে প্রিমিয়াম সাবস্ক্রিপশন প্রয়োজন।",
          solutionEn: "A premium subscription is required to unlock full solutions.",
        })),
        teacherTipsBn: "টিপস দেখতে প্রিমিয়াম মেম্বারশিপে আপগ্রেড করুন।",
        isLocked: true,
        isBookmarked,
      };
    }

    return {
      ...question,
      isLocked: false,
      isBookmarked,
    };
  }

  /**
   * Lists questions with server-side filters, search, pagination, and sorting.
   */
  static async listQuestions(filters: QuestionListFilters, userId?: string, isStaff = false) {
    const {
      category,
      subjectId,
      paperId,
      chapterId,
      topicId,
      boardId,
      examYear,
      difficulty,
      type,
      status,
      isPremium,
      search,
      page = 1,
      limit = 10,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = filters;

    const skip = (Math.max(1, page) - 1) * limit;

    const where: Record<string, unknown> = {
      ...(category ? { category } : {}),
      ...(subjectId ? { subjectId } : {}),
      ...(paperId ? { paperId } : {}),
      ...(chapterId ? { chapterId } : {}),
      ...(topicId ? { topicId } : {}),
      ...(difficulty ? { difficulty } : {}),
      ...(type ? { type } : {}),
      ...(isPremium !== undefined ? { isPremium } : {}),
    };

    // Public / Student vs Staff status visibility
    if (isStaff) {
      if (status) where.status = status;
    } else {
      where.status = ContentStatus.PUBLISHED;
    }

    // Board & Year references filtering
    if (boardId || examYear) {
      where.references = {
        some: {
          ...(boardId ? { boardId } : {}),
          ...(examYear ? { examYear } : {}),
        },
      };
    }

    // Unicode Bengali & English Search
    if (search && search.trim()) {
      const q = search.trim();
      where.OR = [
        { questionTextBn: { contains: q, mode: "insensitive" } },
        { questionTextEn: { contains: q, mode: "insensitive" } },
        { textbookRef: { contains: q, mode: "insensitive" } },
        { tags: { some: { tag: { contains: q, mode: "insensitive" } } } },
      ];
    }

    // Count and paginated query
    const [totalCount, questions] = await Promise.all([
      prisma.question.count({ where }),
      prisma.question.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          subject: { select: { id: true, code: true, nameBn: true, nameEn: true, category: true } },
          paper: { select: { id: true, paperNumber: true, nameBn: true, nameEn: true } },
          chapter: { select: { id: true, chapterNum: true, nameBn: true, nameEn: true } },
          topic: { select: { id: true, nameBn: true, nameEn: true } },
          options: { orderBy: { orderIndex: "asc" } },
          subparts: { orderBy: { orderIndex: "asc" } },
          answer: true,
          references: { include: { board: true, university: true } },
          tags: true,
          _count: { select: { bookmarks: true, reports: true } },
        },
      }),
    ]);

    // Check user bookmarks if logged in
    let bookmarkedIds = new Set<string>();
    if (userId) {
      const userBookmarks = await prisma.bookmark.findMany({
        where: {
          studentId: userId,
          questionId: { in: questions.map((q) => q.id) },
        },
        select: { questionId: true },
      });
      bookmarkedIds = new Set(userBookmarks.map((b) => b.questionId));
    }

    return {
      questions: questions.map((q) => ({
        ...q,
        isBookmarked: bookmarkedIds.has(q.id),
      })),
      pagination: {
        page: Math.max(1, page),
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit) || 1,
      },
    };
  }

  /**
   * Bookmark and Unbookmark
   */
  static async toggleBookmark(questionId: string, studentId: string) {
    const existing = await prisma.bookmark.findUnique({
      where: { studentId_questionId: { studentId, questionId } },
    });

    if (existing) {
      await prisma.bookmark.delete({
        where: { id: existing.id },
      });
      return { bookmarked: false };
    } else {
      await prisma.bookmark.create({
        data: { studentId, questionId },
      });
      return { bookmarked: true };
    }
  }

  /**
   * Report an error in a question
   */
  static async reportQuestion(
    questionId: string,
    userId: string | null,
    data: { reason: ReportReason; description?: string }
  ) {
    return prisma.questionReport.create({
      data: {
        questionId,
        userId: userId || null,
        reason: data.reason,
        description: data.description || null,
        status: ReportStatus.PENDING,
      },
    });
  }

  /**
   * Retrieves similar questions based on Chapter and Topic
   */
  static async getSimilarQuestions(questionId: string, limit = 4) {
    const question = await prisma.question.findUnique({
      where: { id: questionId },
      select: { chapterId: true, topicId: true, subjectId: true },
    });

    if (!question) return [];

    return prisma.question.findMany({
      where: {
        id: { not: questionId },
        chapterId: question.chapterId,
        status: ContentStatus.PUBLISHED,
      },
      take: limit,
      include: {
        subject: { select: { nameBn: true, nameEn: true } },
        chapter: { select: { nameBn: true, chapterNum: true } },
        references: { include: { board: true } },
      },
    });
  }
}
