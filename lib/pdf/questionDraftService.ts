import prisma from "@/lib/db/prisma";
import { AiQuestionGeneratorService, QuestionGenerationConfig } from "./aiQuestionGenerator";
import { TextCleanerService } from "./textCleaner";
import { AuditService } from "@/lib/audit/auditService";
import { canApproveQuestions } from "@/lib/auth/rbac";
import { SessionUser } from "@/lib/auth/jwt";
import {
  AiQuestionType,
  DraftQuestionStatus,
  DifficultyLevel,
  GenerationJobStatus,
  QuestionType,
  ContentStatus,
  ExamCategoryType,
} from "@prisma/client";

export interface ListDraftsFilters {
  status?: DraftQuestionStatus;
  type?: AiQuestionType;
  difficulty?: DifficultyLevel;
  sourcePage?: number;
  search?: string;
  page?: number;
  limit?: number;
}

export interface UpdateDraftInput {
  questionTextBn?: string;
  questionTextEn?: string | null;
  stemBn?: string | null;
  stemEn?: string | null;
  options?: {
    optionKey: string;
    textBn: string;
    textEn?: string | null;
    isCorrect: boolean;
  }[];
  correctKey?: string | null;
  answerTextBn?: string | null;
  explanationBn?: string;
  explanationEn?: string | null;
  markingRubric?: string | null;
  marks?: number;
  negativeMarks?: number;
  difficulty?: DifficultyLevel;
  topicOrConcept?: string | null;
  notes?: string;
}

export class QuestionDraftService {
  /**
   * Starts a question generation job for a PDF import and persists the generated drafts.
   */
  static async startGeneration(
    importId: string,
    config: QuestionGenerationConfig,
    user: SessionUser
  ) {
    const imp = await prisma.pdfImport.findUnique({
      where: { id: importId },
      include: {
        pages: { orderBy: { pageNumber: "asc" } },
        subject: true,
        chapter: true,
      },
    });

    if (!imp) {
      throw new Error("PDF Import record not found.");
    }

    if (imp.pages.length === 0) {
      throw new Error("Document has no extracted pages. Run text extraction first.");
    }

    // 1. Create generation job record
    const job = await prisma.questionGenerationJob.create({
      data: {
        pdfImportId: importId,
        requestedById: user.id,
        status: GenerationJobStatus.GENERATING,
        requestedCount: config.requestedCount || 10,
        targetLanguage: config.language || imp.detectedLanguage || "bn",
        targetDifficulty: config.difficulty || DifficultyLevel.MEDIUM,
        modelUsed: "gemini-1.5-flash",
        configJson: JSON.stringify(config),
      },
    });

    try {
      // 2. Prepare pages context
      const pagesForGen = imp.pages.map((p) => ({
        pageNumber: p.pageNumber,
        text: p.cleanedText || p.rawText,
      }));

      // Enrich config with curriculum data if available
      const genConfig: QuestionGenerationConfig = {
        ...config,
        subjectName: imp.subject?.nameBn || imp.subject?.nameEn || config.subjectName,
        chapterName: imp.chapter?.nameBn || imp.chapter?.nameEn || config.chapterName,
        category: imp.category || config.category,
      };

      // 3. Generate questions via AI service
      const genResult = await AiQuestionGeneratorService.generateQuestions(pagesForGen, genConfig);

      // 4. Save generated drafts to database in a transaction
      await prisma.$transaction(async (tx) => {
        for (const q of genResult.questions) {
          const cleanQuestionText = TextCleanerService.cleanPageText(q.questionTextBn);
          const cleanExplanation = TextCleanerService.cleanPageText(q.explanationBn);
          const cleanAnswer = q.answerTextBn ? TextCleanerService.cleanPageText(q.answerTextBn) : null;
          const cleanStem = q.stemBn ? TextCleanerService.cleanPageText(q.stemBn) : null;
          const cleanPassage = q.sourcePassage ? TextCleanerService.cleanPageText(q.sourcePassage) : null;

          await tx.generatedQuestionDraft.create({
            data: {
              jobId: job.id,
              pdfImportId: importId,
              questionType: q.questionType,
              difficulty: config.difficulty || DifficultyLevel.MEDIUM,
              status: DraftQuestionStatus.DRAFT,
              questionTextBn: cleanQuestionText,
              questionTextEn: q.questionTextEn ? TextCleanerService.decodeHtmlEntities(q.questionTextEn) : null,
              stemBn: cleanStem,
              stemEn: q.stemEn ? TextCleanerService.decodeHtmlEntities(q.stemEn) : null,
              optionsJson: q.options ? JSON.stringify(q.options) : null,
              correctKey: q.correctKey || null,
              answerTextBn: cleanAnswer,
              explanationBn: cleanExplanation,
              explanationEn: q.explanationEn ? TextCleanerService.decodeHtmlEntities(q.explanationEn) : null,
              markingRubric: q.markingRubric || null,
              marks: q.marks || config.defaultMarks || 1.0,
              negativeMarks: q.negativeMarks || config.negativeMarks || 0.25,
              estimatedSeconds: q.estimatedSeconds || 60,
              sourcePage: q.sourcePage,
              sourcePassage: cleanPassage,
              topicOrConcept: q.topicOrConcept || null,
              category: imp.category || "HSC",
              subjectId: imp.subjectId || (await this.getOrCreateDefaultSubject(tx, imp.category || "HSC")),
              chapterId: imp.chapterId || (await this.getOrCreateDefaultChapter(tx, imp.subjectId)),
            },
          });
        }

        // Update job completion
        await tx.questionGenerationJob.update({
          where: { id: job.id },
          data: {
            status: GenerationJobStatus.COMPLETED,
            generatedCount: genResult.questions.length,
            modelUsed: genResult.modelUsed,
            promptTokens: genResult.promptTokens || null,
            completionTokens: genResult.completionTokens || null,
            completedAt: new Date(),
          },
        });
      });

      // 5. Audit log
      await AuditService.log({
        userId: user.id,
        action: "AI_QUESTIONS_GENERATED",
        resource: "pdf_import",
        resourceId: importId,
        details: {
          jobId: job.id,
          count: genResult.questions.length,
          model: genResult.modelUsed,
        },
      });

      return {
        jobId: job.id,
        count: genResult.questions.length,
        modelUsed: genResult.modelUsed,
      };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      await prisma.questionGenerationJob.update({
        where: { id: job.id },
        data: {
          status: GenerationJobStatus.FAILED,
          errorMessage: errorMsg,
          completedAt: new Date(),
        },
      });
      throw err;
    }
  }

  /**
   * Helper to ensure valid subject exists
   */
  private static async getOrCreateDefaultSubject(tx: any, category: string): Promise<string> {
    const existing = await tx.subject.findFirst({ where: { category } });
    if (existing) return existing.id;
    const created = await tx.subject.create({
      data: {
        code: `GEN_${category}_1`,
        nameEn: `${category} General Studies`,
        nameBn: `${category} সাধারণ পাঠ্যক্রম`,
        category,
      },
    });
    return created.id;
  }

  /**
   * Helper to ensure valid chapter exists
   */
  private static async getOrCreateDefaultChapter(tx: any, subjectId?: string | null): Promise<string> {
    if (subjectId) {
      const existing = await tx.chapter.findFirst({ where: { subjectId } });
      if (existing) return existing.id;
      const created = await tx.chapter.create({
        data: {
          subjectId,
          chapterNum: 1,
          nameEn: "Chapter 1",
          nameBn: "অধ্যায় ১",
        },
      });
      return created.id;
    }
    const anyChap = await tx.chapter.findFirst();
    if (anyChap) return anyChap.id;
    throw new Error("No chapter available for curriculum mapping.");
  }

  /**
   * Lists generated question drafts for an import with filters and pagination.
   */
  static async listDrafts(importId: string, filters: ListDraftsFilters) {
    const page = Math.max(1, filters.page || 1);
    const limit = Math.min(100, Math.max(1, filters.limit || 20));
    const skip = (page - 1) * limit;

    const where: any = { pdfImportId: importId };
    if (filters.status) where.status = filters.status;
    if (filters.type) where.questionType = filters.type;
    if (filters.difficulty) where.difficulty = filters.difficulty;
    if (typeof filters.sourcePage === "number") where.sourcePage = filters.sourcePage;
    if (filters.search) {
      where.OR = [
        { questionTextBn: { contains: filters.search, mode: "insensitive" } },
        { questionTextEn: { contains: filters.search, mode: "insensitive" } },
        { topicOrConcept: { contains: filters.search, mode: "insensitive" } },
      ];
    }

    const [total, items, countsByStatus] = await Promise.all([
      prisma.generatedQuestionDraft.count({ where }),
      prisma.generatedQuestionDraft.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ sourcePage: "asc" }, { createdAt: "asc" }],
        include: {
          reviewEvents: {
            orderBy: { createdAt: "desc" },
            take: 3,
            include: { reviewer: { select: { fullName: true, email: true } } },
          },
        },
      }),
      prisma.generatedQuestionDraft.groupBy({
        by: ["status"],
        where: { pdfImportId: importId },
        _count: true,
      }),
    ]);

    const statusCounts: Record<string, number> = {
      TOTAL: 0,
      DRAFT: 0,
      REVIEW: 0,
      APPROVED: 0,
      REJECTED: 0,
      IMPORTED: 0,
    };
    for (const group of countsByStatus) {
      statusCounts[group.status] = group._count;
      statusCounts.TOTAL += group._count;
    }

    return {
      items: items.map((item) => {
        const rawOptions = item.optionsJson ? JSON.parse(item.optionsJson) : [];
        const cleanOptions = rawOptions.map((o: any) => ({
          ...o,
          textBn: TextCleanerService.decodeHtmlEntities(o.textBn),
          textEn: o.textEn ? TextCleanerService.decodeHtmlEntities(o.textEn) : null,
        }));

        return {
          ...item,
          questionTextBn: TextCleanerService.decodeHtmlEntities(item.questionTextBn),
          questionTextEn: item.questionTextEn ? TextCleanerService.decodeHtmlEntities(item.questionTextEn) : null,
          stemBn: item.stemBn ? TextCleanerService.decodeHtmlEntities(item.stemBn) : null,
          stemEn: item.stemEn ? TextCleanerService.decodeHtmlEntities(item.stemEn) : null,
          answerTextBn: item.answerTextBn ? TextCleanerService.decodeHtmlEntities(item.answerTextBn) : null,
          explanationBn: TextCleanerService.decodeHtmlEntities(item.explanationBn),
          explanationEn: item.explanationEn ? TextCleanerService.decodeHtmlEntities(item.explanationEn) : null,
          sourcePassage: item.sourcePassage ? TextCleanerService.decodeHtmlEntities(item.sourcePassage) : null,
          options: cleanOptions,
        };
      }),
      statusCounts,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Updates an individual question draft with review event logging.
   */
  static async updateDraft(draftId: string, input: UpdateDraftInput, user: SessionUser) {
    const draft = await prisma.generatedQuestionDraft.findUnique({
      where: { id: draftId },
    });
    if (!draft) throw new Error("Question draft not found.");
    if (draft.status === DraftQuestionStatus.IMPORTED) {
      throw new Error("Cannot edit a question draft that has already been imported into the official question bank.");
    }

    const updateData: any = {};
    if (input.questionTextBn !== undefined) updateData.questionTextBn = input.questionTextBn;
    if (input.questionTextEn !== undefined) updateData.questionTextEn = input.questionTextEn;
    if (input.stemBn !== undefined) updateData.stemBn = input.stemBn;
    if (input.stemEn !== undefined) updateData.stemEn = input.stemEn;
    if (input.options !== undefined) updateData.optionsJson = JSON.stringify(input.options);
    if (input.correctKey !== undefined) updateData.correctKey = input.correctKey;
    if (input.answerTextBn !== undefined) updateData.answerTextBn = input.answerTextBn;
    if (input.explanationBn !== undefined) updateData.explanationBn = input.explanationBn;
    if (input.explanationEn !== undefined) updateData.explanationEn = input.explanationEn;
    if (input.markingRubric !== undefined) updateData.markingRubric = input.markingRubric;
    if (input.marks !== undefined) updateData.marks = input.marks;
    if (input.negativeMarks !== undefined) updateData.negativeMarks = input.negativeMarks;
    if (input.difficulty !== undefined) updateData.difficulty = input.difficulty;
    if (input.topicOrConcept !== undefined) updateData.topicOrConcept = input.topicOrConcept;

    const updated = await prisma.$transaction(async (tx) => {
      const d = await tx.generatedQuestionDraft.update({
        where: { id: draftId },
        data: updateData,
      });

      await tx.questionReviewEvent.create({
        data: {
          draftId,
          reviewerId: user.id,
          action: "EDIT",
          previousStatus: draft.status,
          newStatus: d.status,
          notes: input.notes || "Draft fields updated during editorial review.",
          diffJson: JSON.stringify(updateData),
        },
      });

      return d;
    });

    return {
      ...updated,
      options: updated.optionsJson ? JSON.parse(updated.optionsJson) : [],
    };
  }

  /**
   * Regenerates a single question draft using the exact source page context.
   */
  static async regenerateDraft(draftId: string, user: SessionUser) {
    const draft = await prisma.generatedQuestionDraft.findUnique({
      where: { id: draftId },
      include: { pdfImport: { include: { pages: true } } },
    });
    if (!draft) throw new Error("Question draft not found.");
    if (draft.status === DraftQuestionStatus.IMPORTED) {
      throw new Error("Cannot regenerate a draft that has already been imported.");
    }

    const targetPage = draft.pdfImport.pages.find((p) => p.pageNumber === draft.sourcePage) || draft.pdfImport.pages[0];
    if (!targetPage) throw new Error("Source document page is missing.");

    // Generate single replacement question
    const config: QuestionGenerationConfig = {
      requestedCount: 1,
      questionTypes: [draft.questionType],
      difficulty: draft.difficulty,
      language: "bn",
      defaultMarks: draft.marks,
      negativeMarks: draft.negativeMarks,
    };

    const genResult = await AiQuestionGeneratorService.generateQuestions(
      [{ pageNumber: targetPage.pageNumber, text: targetPage.cleanedText || targetPage.rawText }],
      config
    );

    if (genResult.questions.length === 0) {
      throw new Error("AI provider could not generate a question from this page.");
    }

    const replacement = genResult.questions[0];

    const updated = await prisma.$transaction(async (tx) => {
      const d = await tx.generatedQuestionDraft.update({
        where: { id: draftId },
        data: {
          questionTextBn: replacement.questionTextBn,
          questionTextEn: replacement.questionTextEn || null,
          stemBn: replacement.stemBn || null,
          optionsJson: replacement.options ? JSON.stringify(replacement.options) : null,
          correctKey: replacement.correctKey || null,
          answerTextBn: replacement.answerTextBn || null,
          explanationBn: replacement.explanationBn,
          explanationEn: replacement.explanationEn || null,
          markingRubric: replacement.markingRubric || null,
          sourcePassage: replacement.sourcePassage,
          status: DraftQuestionStatus.DRAFT,
        },
      });

      await tx.questionReviewEvent.create({
        data: {
          draftId,
          reviewerId: user.id,
          action: "REGENERATE",
          previousStatus: draft.status,
          newStatus: DraftQuestionStatus.DRAFT,
          notes: "Question regenerated from source page context.",
        },
      });

      return d;
    });

    return {
      ...updated,
      options: updated.optionsJson ? JSON.parse(updated.optionsJson) : [],
    };
  }

  /**
   * Approves an individual question draft with separation-of-duties enforcement.
   */
  static async approveDraft(draftId: string, user: SessionUser, notes?: string) {
    const draft = await prisma.generatedQuestionDraft.findUnique({
      where: { id: draftId },
      include: { pdfImport: true },
    });
    if (!draft) throw new Error("Question draft not found.");

    // Strict separation of duties: author cannot approve own questions unless SuperAdmin
    if (!canApproveQuestions(user, draft.pdfImport.uploadedById)) {
      throw new Error("Academic Quality Violation: You cannot approve questions generated from your own document.");
    }

    const updated = await prisma.$transaction(async (tx) => {
      const d = await tx.generatedQuestionDraft.update({
        where: { id: draftId },
        data: { status: DraftQuestionStatus.APPROVED },
      });

      await tx.questionReviewEvent.create({
        data: {
          draftId,
          reviewerId: user.id,
          action: "APPROVE",
          previousStatus: draft.status,
          newStatus: DraftQuestionStatus.APPROVED,
          notes: notes || "Question approved for question bank import.",
        },
      });

      return d;
    });

    return updated;
  }

  /**
   * Rejects an individual question draft.
   */
  static async rejectDraft(draftId: string, user: SessionUser, notes?: string) {
    const draft = await prisma.generatedQuestionDraft.findUnique({
      where: { id: draftId },
    });
    if (!draft) throw new Error("Question draft not found.");

    const updated = await prisma.$transaction(async (tx) => {
      const d = await tx.generatedQuestionDraft.update({
        where: { id: draftId },
        data: { status: DraftQuestionStatus.REJECTED },
      });

      await tx.questionReviewEvent.create({
        data: {
          draftId,
          reviewerId: user.id,
          action: "REJECT",
          previousStatus: draft.status,
          newStatus: DraftQuestionStatus.REJECTED,
          notes: notes || "Question rejected by content reviewer.",
        },
      });

      return d;
    });

    return updated;
  }

  /**
   * Bulk actions for drafts: APPROVE, REJECT, or DELETE.
   */
  static async bulkAction(draftIds: string[], action: "APPROVE" | "REJECT" | "DELETE", user: SessionUser) {
    if (!draftIds || draftIds.length === 0) {
      throw new Error("No draft IDs provided for bulk action.");
    }

    if (action === "DELETE") {
      await prisma.generatedQuestionDraft.deleteMany({
        where: {
          id: { in: draftIds },
          status: { not: DraftQuestionStatus.IMPORTED },
        },
      });
      return { success: true, count: draftIds.length };
    }

    const targetStatus = action === "APPROVE" ? DraftQuestionStatus.APPROVED : DraftQuestionStatus.REJECTED;

    await prisma.$transaction(async (tx) => {
      for (const id of draftIds) {
        const draft = await tx.generatedQuestionDraft.findUnique({
          where: { id },
          include: { pdfImport: true },
        });
        if (!draft || draft.status === DraftQuestionStatus.IMPORTED) continue;

        if (action === "APPROVE" && !canApproveQuestions(user, draft.pdfImport.uploadedById)) {
          continue; // Skip drafts violating separation of duties
        }

        await tx.generatedQuestionDraft.update({
          where: { id },
          data: { status: targetStatus },
        });

        await tx.questionReviewEvent.create({
          data: {
            draftId: id,
            reviewerId: user.id,
            action,
            previousStatus: draft.status,
            newStatus: targetStatus,
            notes: `Bulk ${action.toLowerCase()} action executed.`,
          },
        });
      }
    });

    return { success: true, count: draftIds.length };
  }

  /**
   * Approves all unapproved drafts for a specific PDF document in a single atomic transaction.
   */
  static async approveAllForImport(importId: string, user: SessionUser) {
    const drafts = await prisma.generatedQuestionDraft.findMany({
      where: {
        pdfImportId: importId,
        status: { in: [DraftQuestionStatus.DRAFT, DraftQuestionStatus.REJECTED] },
      },
      include: { pdfImport: true },
    });

    if (drafts.length === 0) {
      return { success: true, count: 0, message: "No unapproved drafts found." };
    }

    const approvableDrafts = drafts.filter((d) => canApproveQuestions(user, d.pdfImport.uploadedById));

    await prisma.$transaction(async (tx) => {
      for (const draft of approvableDrafts) {
        await tx.generatedQuestionDraft.update({
          where: { id: draft.id },
          data: { status: DraftQuestionStatus.APPROVED },
        });

        await tx.questionReviewEvent.create({
          data: {
            draftId: draft.id,
            reviewerId: user.id,
            action: "APPROVE",
            previousStatus: draft.status,
            newStatus: DraftQuestionStatus.APPROVED,
            notes: "Batch approved via Approve All Document Questions action.",
          },
        });
      }
    });

    return { success: true, count: approvableDrafts.length };
  }

  /**
   * Imports approved question drafts into the official Question Bank (Question, QuestionOption, QuestionAnswer).
   */
  static async importToQuestionBank(
    draftIds: string[],
    user: SessionUser,
    options?: {
      publishImmediately?: boolean;
      category?: ExamCategoryType;
      classId?: string;
      subjectId?: string;
      chapterId?: string;
      customSubjectName?: string;
      customChapterName?: string;
      topicName?: string;
      isPremium?: boolean;
    }
  ) {
    if (!draftIds || draftIds.length === 0) {
      throw new Error("No draft IDs provided for import.");
    }

    const drafts = await prisma.generatedQuestionDraft.findMany({
      where: {
        id: { in: draftIds },
        status: DraftQuestionStatus.APPROVED,
      },
      include: {
        pdfImport: true,
      },
    });

    if (drafts.length === 0) {
      throw new Error("No approved question drafts found to import. Please approve questions before importing.");
    }

    // 1. Resolve Target Category
    const targetCategory: ExamCategoryType =
      options?.category && Object.values(ExamCategoryType).includes(options.category)
        ? options.category
        : (drafts[0]?.category as ExamCategoryType) || ExamCategoryType.HSC;

    // 2. Resolve or Create Target Subject
    let targetSubjectId = options?.subjectId;
    if (!targetSubjectId && options?.customSubjectName) {
      let subj = await prisma.subject.findFirst({
        where: {
          nameBn: options.customSubjectName,
          category: targetCategory,
        },
      });
      if (!subj) {
        const code = "SUB_" + Math.random().toString(36).substring(2, 8).toUpperCase();
        subj = await prisma.subject.create({
          data: {
            code,
            nameBn: options.customSubjectName,
            nameEn: options.customSubjectName,
            category: targetCategory,
            classId: options?.classId || null,
          },
        });
      }
      targetSubjectId = subj.id;
    }

    if (!targetSubjectId && drafts[0]?.subjectId) {
      targetSubjectId = drafts[0].subjectId;
    }

    // Fallback subject if neither options nor draft had one:
    if (!targetSubjectId) {
      let defaultSubj = await prisma.subject.findFirst({
        where: { category: targetCategory },
      });
      if (!defaultSubj) {
        const code = "SUB_" + Math.random().toString(36).substring(2, 8).toUpperCase();
        defaultSubj = await prisma.subject.create({
          data: {
            code,
            nameBn: "সাধারণ বিষয়",
            nameEn: "General Subject",
            category: targetCategory,
            classId: options?.classId || null,
          },
        });
      }
      targetSubjectId = defaultSubj.id;
    }

    // 3. Resolve or Create Target Chapter
    let targetChapterId = options?.chapterId;
    if (targetSubjectId && !targetChapterId && options?.customChapterName) {
      let chap = await prisma.chapter.findFirst({
        where: {
          subjectId: targetSubjectId,
          nameBn: options.customChapterName,
        },
      });
      if (!chap) {
        const lastChap = await prisma.chapter.findFirst({
          where: { subjectId: targetSubjectId },
          orderBy: { chapterNum: "desc" },
        });
        const nextNum = (lastChap?.chapterNum || 0) + 1;
        chap = await prisma.chapter.create({
          data: {
            subjectId: targetSubjectId,
            chapterNum: nextNum,
            nameBn: options.customChapterName,
            nameEn: options.customChapterName,
          },
        });
      }
      targetChapterId = chap.id;
    }

    if (!targetChapterId && drafts[0]?.chapterId) {
      targetChapterId = drafts[0].chapterId;
    }

    // Fallback chapter if neither options nor draft had one:
    if (targetSubjectId && !targetChapterId) {
      let defaultChap = await prisma.chapter.findFirst({
        where: { subjectId: targetSubjectId },
      });
      if (!defaultChap) {
        defaultChap = await prisma.chapter.create({
          data: {
            subjectId: targetSubjectId,
            chapterNum: 1,
            nameBn: "অধ্যায় ১: সাধারণ প্রশ্নোত্তর",
            nameEn: "Chapter 1: General Questions",
          },
        });
      }
      targetChapterId = defaultChap.id;
    }

    // Update parent pdfImport with mapped curriculum
    if (drafts[0]?.pdfImportId) {
      await prisma.pdfImport.update({
        where: { id: drafts[0].pdfImportId },
        data: {
          category: targetCategory,
          classId: options?.classId || undefined,
          subjectId: targetSubjectId || undefined,
          chapterId: targetChapterId || undefined,
        },
      }).catch(() => {});
    }

    // 4. Resolve or Create Target Topic
    let targetTopicId: string | null = null;
    if (options?.topicName && targetChapterId) {
      const parentChapId = targetChapterId;
      let topic = await prisma.topic.findFirst({
        where: {
          chapterId: parentChapId,
          nameBn: options.topicName,
        },
      });
      if (!topic) {
        topic = await prisma.topic.create({
          data: {
            chapterId: parentChapId,
            nameBn: options.topicName,
            nameEn: options.topicName,
          },
        });
      }
      targetTopicId = topic.id;
    }

    const importedQuestionIds: string[] = [];

    await prisma.$transaction(async (tx) => {
      for (const draft of drafts) {
        // Map AiQuestionType to official QuestionType enum
        let bankType: QuestionType = QuestionType.MCQ;
        if (draft.questionType === AiQuestionType.DESCRIPTIVE || draft.questionType === AiQuestionType.SHORT_ANSWER) {
          bankType = QuestionType.CQ;
        } else if (draft.questionType === AiQuestionType.FILL_IN_BLANK) {
          bankType = QuestionType.FILL_IN_BLANK;
        }

        const textbookCitation = `উৎস পিডিএফ: ${draft.pdfImport.fileName}, পৃষ্ঠা: ${draft.sourcePage || 1}`;

        const finalCategory = targetCategory;
        const finalSubjectId = targetSubjectId || draft.subjectId;
        const finalChapterId = targetChapterId || draft.chapterId;
        const finalTopicId = targetTopicId || null;

        // 1. Create Question in official Question Bank
        const question = await tx.question.create({
          data: {
            type: bankType,
            difficulty: draft.difficulty,
            status: options?.publishImmediately ? ContentStatus.PUBLISHED : ContentStatus.APPROVED,
            isPremium: Boolean(options?.isPremium),
            questionTextBn: draft.questionTextBn,
            questionTextEn: draft.questionTextEn || null,
            stemBn: draft.stemBn || null,
            stemEn: draft.stemEn || null,
            marks: draft.marks,
            negativeMarks: draft.negativeMarks,
            estimatedSeconds: draft.estimatedSeconds,
            category: finalCategory,
            subjectId: finalSubjectId,
            chapterId: finalChapterId,
            topicId: finalTopicId,
            textbookRef: textbookCitation,
            authorId: user.id,
            pdfImportId: draft.pdfImportId,
          },
        });

        // 2. Insert Options if MCQ or True/False
        const rawOptions = draft.optionsJson ? JSON.parse(draft.optionsJson) : [];
        if (Array.isArray(rawOptions) && rawOptions.length > 0) {
          for (let i = 0; i < rawOptions.length; i++) {
            const opt = rawOptions[i];
            await tx.questionOption.create({
              data: {
                questionId: question.id,
                optionKey: opt.optionKey || String.fromCharCode(65 + i), // A, B, C, D
                textBn: opt.textBn || "",
                textEn: opt.textEn || null,
                isCorrect: Boolean(opt.isCorrect),
                orderIndex: i,
              },
            });
          }
        }

        // 3. Insert Answer Key & Explanation
        await tx.questionAnswer.create({
          data: {
            questionId: question.id,
            correctKey: draft.correctKey || "A",
            explanationBn: draft.explanationBn,
            explanationEn: draft.explanationEn || null,
          },
        });

        // 4. Insert Subparts / Rubric if CQ or Descriptive
        if (bankType === QuestionType.CQ && draft.markingRubric) {
          await tx.questionSubpart.create({
            data: {
              questionId: question.id,
              partLabel: "ক",
              questionTextBn: draft.questionTextBn,
              questionTextEn: draft.questionTextEn || null,
              marks: draft.marks,
              solutionBn: draft.answerTextBn || draft.explanationBn,
              markingGuidance: draft.markingRubric,
              orderIndex: 0,
            },
          });
        }

        // 5. Update draft status to IMPORTED and link to created Question
        await tx.generatedQuestionDraft.update({
          where: { id: draft.id },
          data: {
            status: DraftQuestionStatus.IMPORTED,
            importedQuestionId: question.id,
          },
        });

        // 6. Record review event
        await tx.questionReviewEvent.create({
          data: {
            draftId: draft.id,
            reviewerId: user.id,
            action: "IMPORT",
            previousStatus: DraftQuestionStatus.APPROVED,
            newStatus: DraftQuestionStatus.IMPORTED,
            notes: `Imported to Question Bank (Question ID: ${question.id}).`,
          },
        });

        importedQuestionIds.push(question.id);
      }
    });

    await AuditService.log({
      userId: user.id,
      action: "QUESTIONS_IMPORTED_TO_BANK",
      resource: "question_bank",
      details: {
        count: importedQuestionIds.length,
        questionIds: importedQuestionIds,
      },
    });

    return {
      success: true,
      importedCount: importedQuestionIds.length,
      questionIds: importedQuestionIds,
    };
  }

  /**
   * Refreshes or heals existing question drafts when underlying page text is healed / updated.
   * Invalidates corrupted text and re-generates clean, curriculum-aligned questions from the healed page text.
   */
  static async refreshDraftsForPages(importId: string, pageNumbers: number[], userId: string) {
    const imp = await prisma.pdfImport.findUnique({
      where: { id: importId },
      include: {
        pages: { where: { pageNumber: { in: pageNumbers } } },
        subject: true,
        chapter: true,
      },
    });
    if (!imp || imp.pages.length === 0) return;

    // Find drafts belonging to these pages with status DRAFT
    const drafts = await prisma.generatedQuestionDraft.findMany({
      where: {
        pdfImportId: importId,
        sourcePage: { in: pageNumbers },
        status: DraftQuestionStatus.DRAFT,
      },
    });

    const pageMap = new Map<number, string>();
    for (const p of imp.pages) {
      pageMap.set(p.pageNumber, p.cleanedText);
    }

    for (const draft of drafts) {
      const pageNum = draft.sourcePage || pageNumbers[0];
      const healedPageText = pageMap.get(pageNum);
      if (!healedPageText) continue;

      const isBroken =
        TextCleanerService.isBrokenBengaliFont(draft.questionTextBn) ||
        TextCleanerService.isBrokenBengaliFont(draft.explanationBn) ||
        draft.questionTextBn.includes("&#") ||
        draft.explanationBn.includes("&#");

      if (isBroken) {
        // Generate replacement clean question from healed page
        const genQuestions = AiQuestionGeneratorService.generateGroundedQuestionsFromText(
          [{ pageNumber: pageNum, text: healedPageText }],
          {
            requestedCount: 1,
            questionTypes: [draft.questionType],
            difficulty: draft.difficulty,
          },
          1,
          [draft.questionType],
          "bn"
        );

        if (genQuestions.length > 0) {
          const cleanQ = genQuestions[0];
          await prisma.generatedQuestionDraft.update({
            where: { id: draft.id },
            data: {
              questionTextBn: cleanQ.questionTextBn,
              questionTextEn: cleanQ.questionTextEn || null,
              stemBn: cleanQ.stemBn || null,
              stemEn: cleanQ.stemEn || null,
              optionsJson: cleanQ.options ? JSON.stringify(cleanQ.options) : null,
              correctKey: cleanQ.correctKey || null,
              answerTextBn: cleanQ.answerTextBn || null,
              explanationBn: cleanQ.explanationBn,
              markingRubric: cleanQ.markingRubric || null,
              sourcePassage: cleanQ.sourcePassage,
            },
          });

          await prisma.questionReviewEvent.create({
            data: {
              draftId: draft.id,
              reviewerId: userId,
              action: "AUTO_HEAL",
              previousStatus: draft.status,
              newStatus: draft.status,
              notes: "Automatically refreshed question draft from OCR-healed Unicode text.",
            },
          });
        }
      }
    }
  }
}
