import prisma from "@/lib/db/prisma";
import {
  ExamCategoryType,
  ExamMode,
  ExamSessionStatus,
  DifficultyLevel,
  ContentStatus,
  SubscriptionStatus,
  ExamType,
  ExamStatus,
  ExamAccessType,
  ResultReleasePolicy,
  FinalizationReason,
} from "@prisma/client";

export interface CreateExamParams {
  studentId: string;
  category: ExamCategoryType;
  subjectId: string;
  paperId?: string;
  chapterIds: string[];
  questionCount: number;
  durationMinutes: number;
  difficulty: "EASY" | "MEDIUM" | "HARD" | "MIXED";
  mode: ExamMode;
  adaptive?: boolean;
}

export interface SubmitExamParams {
  sessionId: string;
  studentId: string;
  answers: {
    questionId: string;
    selectedOption?: string | null;
    writtenAnswer?: string | null;
    timeSpentSec?: number;
  }[];
  finalizationReason?: FinalizationReason;
}

export interface AdminExamInput {
  titleBn: string;
  titleEn: string;
  descriptionBn?: string;
  descriptionEn?: string;
  category: ExamCategoryType;
  examType?: ExamType;
  academicClassId?: string;
  subjectId?: string;
  paperId?: string;
  chapterId?: string;
  boardId?: string;
  examYear?: number;
  durationMinutes: number;
  totalMarks: number;
  passMarks?: number;
  negativeMarks?: number;
  questionCount: number;
  randomizeQuestions?: boolean;
  randomizeOptions?: boolean;
  startDate?: string | null;
  endDate?: string | null;
  maxAttempts?: number | null;
  status?: ExamStatus;
  accessType?: ExamAccessType;
  priceBdt?: number | null;
  releasePolicy?: ResultReleasePolicy;
  instructionsBn?: string;
  instructionsEn?: string;
  allowedResources?: string;
  questionIds?: string[];
  sections?: {
    titleBn: string;
    titleEn: string;
    descriptionBn?: string;
    descriptionEn?: string;
    durationMinutes?: number;
    totalMarks?: number;
    orderIndex?: number;
    questionIds?: string[];
  }[];
}

export class ExamService {
  // -------------------------------------------------------------------------
  // 1. ADMIN / TEACHER EXAM CREATION & MANAGEMENT
  // -------------------------------------------------------------------------

  /**
   * Creates a full-fledged exam with sections and assigned questions.
   */
  static async createAdminExam(
    arg1: string | AdminExamInput,
    arg2: string | AdminExamInput
  ) {
    const input = (typeof arg1 === "object" ? arg1 : arg2) as AdminExamInput;
    const authorId = (typeof arg1 === "string" ? arg1 : arg2) as string;

    if (!input.durationMinutes || input.durationMinutes <= 0) {
      throw new Error("Duration must be greater than zero");
    }
    if (!input.totalMarks || input.totalMarks <= 0) {
      throw new Error("Total marks must be greater than zero");
    }
    if (input.startDate && input.endDate) {
      if (new Date(input.startDate) >= new Date(input.endDate)) {
        throw new Error("Start date must be before end date.");
      }
    }

    return await prisma.$transaction(async (tx) => {
      // 1. Create the Exam header
      const exam = await tx.exam.create({
        data: {
          titleBn: input.titleBn,
          titleEn: input.titleEn,
          descriptionBn: input.descriptionBn,
          descriptionEn: input.descriptionEn,
          category: input.category,
          examType: input.examType || ExamType.MODEL_TEST,
          academicClassId: input.academicClassId,
          subjectId: input.subjectId,
          paperId: input.paperId,
          chapterId: input.chapterId,
          boardId: input.boardId,
          examYear: input.examYear,
          durationMinutes: input.durationMinutes,
          totalMarks: input.totalMarks,
          passMarks: input.passMarks,
          negativeMarks: input.negativeMarks ?? 0.25,
          questionCount: input.questionCount,
          randomizeQuestions: input.randomizeQuestions ?? true,
          randomizeOptions: input.randomizeOptions ?? true,
          startDate: input.startDate ? new Date(input.startDate) : null,
          endDate: input.endDate ? new Date(input.endDate) : null,
          maxAttempts: input.maxAttempts ?? 1,
          status: input.status || ExamStatus.DRAFT,
          accessType: input.accessType || ExamAccessType.FREE,
          priceBdt: input.priceBdt,
          releasePolicy: input.releasePolicy || ResultReleasePolicy.IMMEDIATE,
          instructionsBn: input.instructionsBn,
          instructionsEn: input.instructionsEn,
          allowedResources: input.allowedResources,
          authorId,
        },
      });

      // 2. Add sections if provided
      const sectionMap = new Map<number, string>();
      if (input.sections && input.sections.length > 0) {
        for (let i = 0; i < input.sections.length; i++) {
          const s = input.sections[i];
          const createdSec = await tx.examSection.create({
            data: {
              examId: exam.id,
              titleBn: s.titleBn,
              titleEn: s.titleEn,
              descriptionBn: s.descriptionBn,
              descriptionEn: s.descriptionEn,
              durationMinutes: s.durationMinutes,
              totalMarks: s.totalMarks,
              orderIndex: s.orderIndex ?? i + 1,
            },
          });
          sectionMap.set(i, createdSec.id);

          // Assign section-specific questions
          if (s.questionIds && s.questionIds.length > 0) {
            for (let qIdx = 0; qIdx < s.questionIds.length; qIdx++) {
              const qId = s.questionIds[qIdx];
              await tx.examQuestion.create({
                data: {
                  examId: exam.id,
                  sectionId: createdSec.id,
                  questionId: qId,
                  orderIndex: qIdx + 1,
                },
              });
            }
          }
        }
      }

      // 3. Assign overall questions if provided (without specific section)
      if (input.questionIds && input.questionIds.length > 0) {
        for (let qIdx = 0; qIdx < input.questionIds.length; qIdx++) {
          const qId = input.questionIds[qIdx];
          // Check if already assigned via sections
          const existing = await tx.examQuestion.findFirst({
            where: { examId: exam.id, questionId: qId },
          });
          if (!existing) {
            await tx.examQuestion.create({
              data: {
                examId: exam.id,
                questionId: qId,
                orderIndex: qIdx + 1,
              },
            });
          }
        }
      }

      // 4. Audit Log
      await tx.examAuditEvent.create({
        data: {
          examId: exam.id,
          userId: authorId,
          action: "EXAM_CREATED",
          metadataJson: JSON.stringify({
            titleBn: exam.titleBn,
            category: exam.category,
            totalMarks: exam.totalMarks,
          }),
        },
      });

      return await tx.exam.findUniqueOrThrow({
        where: { id: exam.id },
        include: {
          sections: { orderBy: { orderIndex: "asc" } },
          examQuestions: { orderBy: { orderIndex: "asc" } },
        },
      });
    });
  }

  static async updateAdminExam(
    examId: string,
    arg2: string | Partial<AdminExamInput>,
    arg3?: string | Partial<AdminExamInput>
  ) {
    const input = (typeof arg2 === "object" ? arg2 : arg3 || {}) as Partial<AdminExamInput>;
    const userId = (typeof arg2 === "string" ? arg2 : typeof arg3 === "string" ? arg3 : "") as string;

    const existing = await prisma.exam.findUnique({
      where: { id: examId },
      include: { _count: { select: { sessions: true } } },
    });

    if (!existing) {
      throw new Error("Exam not found");
    }

    const hasAttempts = existing._count.sessions > 0;
    const nextVersion = hasAttempts ? existing.version + 1 : existing.version;

    return await prisma.$transaction(async (tx) => {
      const updated = await tx.exam.update({
        where: { id: examId },
        data: {
          ...(input.titleBn ? { titleBn: input.titleBn } : {}),
          ...(input.titleEn ? { titleEn: input.titleEn } : {}),
          ...(input.descriptionBn !== undefined ? { descriptionBn: input.descriptionBn } : {}),
          ...(input.descriptionEn !== undefined ? { descriptionEn: input.descriptionEn } : {}),
          ...(input.category ? { category: input.category } : {}),
          ...(input.examType ? { examType: input.examType } : {}),
          ...(input.academicClassId !== undefined ? { academicClassId: input.academicClassId } : {}),
          ...(input.subjectId !== undefined ? { subjectId: input.subjectId } : {}),
          ...(input.paperId !== undefined ? { paperId: input.paperId } : {}),
          ...(input.chapterId !== undefined ? { chapterId: input.chapterId } : {}),
          ...(input.boardId !== undefined ? { boardId: input.boardId } : {}),
          ...(input.examYear !== undefined ? { examYear: input.examYear } : {}),
          ...(input.durationMinutes ? { durationMinutes: input.durationMinutes } : {}),
          ...(input.totalMarks ? { totalMarks: input.totalMarks } : {}),
          ...(input.passMarks !== undefined ? { passMarks: input.passMarks } : {}),
          ...(input.negativeMarks !== undefined ? { negativeMarks: input.negativeMarks } : {}),
          ...(input.questionCount ? { questionCount: input.questionCount } : {}),
          ...(input.randomizeQuestions !== undefined ? { randomizeQuestions: input.randomizeQuestions } : {}),
          ...(input.randomizeOptions !== undefined ? { randomizeOptions: input.randomizeOptions } : {}),
          ...(input.startDate !== undefined ? { startDate: input.startDate ? new Date(input.startDate) : null } : {}),
          ...(input.endDate !== undefined ? { endDate: input.endDate ? new Date(input.endDate) : null } : {}),
          ...(input.maxAttempts !== undefined ? { maxAttempts: input.maxAttempts } : {}),
          ...(input.status ? { status: input.status } : {}),
          ...(input.accessType ? { accessType: input.accessType } : {}),
          ...(input.priceBdt !== undefined ? { priceBdt: input.priceBdt } : {}),
          ...(input.releasePolicy ? { releasePolicy: input.releasePolicy } : {}),
          ...(input.instructionsBn !== undefined ? { instructionsBn: input.instructionsBn } : {}),
          ...(input.instructionsEn !== undefined ? { instructionsEn: input.instructionsEn } : {}),
          ...(input.allowedResources !== undefined ? { allowedResources: input.allowedResources } : {}),
          version: nextVersion,
        },
      });

      // Update question list if explicitly provided
      if (input.questionIds) {
        await tx.examQuestion.deleteMany({ where: { examId } });
        for (let idx = 0; idx < input.questionIds.length; idx++) {
          await tx.examQuestion.create({
            data: {
              examId,
              questionId: input.questionIds[idx],
              orderIndex: idx + 1,
            },
          });
        }
      }

      await tx.examAuditEvent.create({
        data: {
          examId,
          userId,
          action: "EXAM_UPDATED",
          metadataJson: JSON.stringify({
            version: nextVersion,
            hasAttempts,
          }),
        },
      });

      return updated;
    });
  }

  /**
   * Publishes an exam, ensuring at least one question is assigned and constraints are valid.
   */
  static async publishAdminExam(examId: string, userId: string) {
    const exam = await prisma.exam.findUnique({
      where: { id: examId },
      include: { _count: { select: { examQuestions: true } } },
    });

    if (!exam) {
      throw new Error("Exam not found");
    }

    if (exam._count.examQuestions === 0) {
      throw new Error("Cannot publish exam without assigned questions.");
    }

    const now = new Date();
    const isScheduled = exam.startDate && new Date(exam.startDate) > now;
    const nextStatus = isScheduled ? ExamStatus.SCHEDULED : ExamStatus.PUBLISHED;

    const published = await prisma.exam.update({
      where: { id: examId },
      data: { status: nextStatus },
    });

    await prisma.examAuditEvent.create({
      data: {
        examId,
        userId,
        action: "EXAM_PUBLISHED",
        metadataJson: JSON.stringify({ status: nextStatus }),
      },
    });

    return published;
  }

  /**
   * Archives an exam.
   */
  static async archiveAdminExam(examId: string, userId: string) {
    const exam = await prisma.exam.update({
      where: { id: examId },
      data: { status: ExamStatus.ARCHIVED },
    });

    await prisma.examAuditEvent.create({
      data: {
        examId,
        userId,
        action: "EXAM_ARCHIVED",
      },
    });

    return exam;
  }

  /**
   * Lists exams for administrator/teacher management with filters and attempt counts.
   */
  static async listAdminExams(params?: {
    category?: ExamCategoryType;
    status?: ExamStatus;
    examType?: ExamType;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const { category, status, examType, search, page = 1, limit = 20 } = params || {};
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (category) where.category = category;
    if (status) where.status = status;
    if (examType) where.examType = examType;
    if (search) {
      where.OR = [
        { titleBn: { contains: search, mode: "insensitive" } },
        { titleEn: { contains: search, mode: "insensitive" } },
      ];
    }

    const [total, exams] = await Promise.all([
      prisma.exam.count({ where }),
      prisma.exam.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          subject: { select: { nameBn: true, nameEn: true } },
          _count: {
            select: {
              examQuestions: true,
              sessions: true,
              sections: true,
            },
          },
        },
      }),
    ]);

    return {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      exams: exams.map((e) => ({
        id: e.id,
        titleBn: e.titleBn,
        titleEn: e.titleEn,
        category: e.category,
        examType: e.examType,
        status: e.status,
        accessType: e.accessType,
        durationMinutes: e.durationMinutes,
        totalMarks: e.totalMarks,
        passMarks: e.passMarks,
        negativeMarks: e.negativeMarks,
        questionCount: e._count.examQuestions,
        totalAttempts: e._count.sessions,
        sectionsCount: e._count.sections,
        version: e.version,
        startDate: e.startDate,
        endDate: e.endDate,
        createdAt: e.createdAt,
        _count: e._count,
      })),
    };
  }

  /**
   * Retrieves full details of an exam for admin preview or editing.
   */
  static async getAdminExamDetail(examId: string) {
    const exam = await prisma.exam.findUnique({
      where: { id: examId },
      include: {
        subject: true,
        chapter: true,
        board: true,
        sections: {
          orderBy: { orderIndex: "asc" },
        },
        examQuestions: {
          orderBy: { orderIndex: "asc" },
          include: {
            question: {
              include: {
                options: { orderBy: { orderIndex: "asc" } },
                answer: true,
                subject: true,
                chapter: true,
              },
            },
          },
        },
        _count: { select: { sessions: true } },
      },
    });

    if (!exam) {
      throw new Error("Exam not found");
    }

    return exam;
  }

  // -------------------------------------------------------------------------
  // 2. STUDENT ELIGIBILITY, ATTEMPT CREATION & RECOVERY
  // -------------------------------------------------------------------------

  /**
   * Verifies if a student is eligible to take a specific exam.
   */
  static async checkEligibility(examId: string, studentId: string) {
    const exam = await prisma.exam.findUnique({
      where: { id: examId },
    });

    if (!exam) {
      return { eligible: false, reason: "Exam not found" };
    }

    if (exam.status !== ExamStatus.PUBLISHED && exam.status !== ExamStatus.SCHEDULED) {
      return { eligible: false, reason: "Exam is currently not open." };
    }

    const now = new Date();
    if (exam.startDate && now < new Date(exam.startDate)) {
      return { eligible: false, reason: "Exam has not started yet." };
    }
    if (exam.endDate && now > new Date(exam.endDate)) {
      return { eligible: false, reason: "Exam window has closed." };
    }

    // Access Entitlement Check
    if (exam.accessType === ExamAccessType.SUBSCRIPTION_ONLY) {
      const sub = await prisma.subscription.findFirst({
        where: {
          studentId,
          status: SubscriptionStatus.ACTIVE,
          endDate: { gte: now },
        },
      });
      if (!sub) {
        return {
          eligible: false,
          reason: "This exam requires an active premium subscription.",
          requiresSubscription: true,
        };
      }
    }

    // Attempt Limit Check
    const pastSessions = await prisma.examSession.findMany({
      where: { examId, studentId },
      select: { id: true, status: true },
    });

    const activeSession = pastSessions.find((s) => s.status === ExamSessionStatus.IN_PROGRESS);
    if (activeSession) {
      return {
        eligible: true,
        activeSessionId: activeSession.id,
        isResuming: true,
      };
    }

    const completedCount = pastSessions.filter(
      (s) => s.status === ExamSessionStatus.SUBMITTED || s.status === ExamSessionStatus.EVALUATED
    ).length;

    if (exam.maxAttempts && completedCount >= exam.maxAttempts) {
      return {
        eligible: false,
        reason: `Maximum attempts reached. You have reached the maximum allowed attempts (${exam.maxAttempts}) for this exam.`,
        completedCount,
        attemptsUsed: completedCount,
        maxAttempts: exam.maxAttempts,
      };
    }

    return {
      eligible: true,
      completedCount,
      attemptsUsed: completedCount,
      maxAttempts: exam.maxAttempts ?? 1,
      activeSessionId: undefined,
      remainingAttempts: exam.maxAttempts ? Math.max(0, exam.maxAttempts - completedCount) : null,
      exam: {
        id: exam.id,
        titleBn: exam.titleBn,
        titleEn: exam.titleEn,
        durationMinutes: exam.durationMinutes,
        totalMarks: exam.totalMarks,
        passMarks: exam.passMarks,
        negativeMarks: exam.negativeMarks,
        questionCount: exam.questionCount,
        instructionsBn: exam.instructionsBn,
        instructionsEn: exam.instructionsEn,
      },
    };
  }

  /**
   * Starts a durable exam attempt for an Exam, recording attempt start time and server deadline.
   */
  static async startExamAttempt(examId: string, studentId: string, reqMeta?: { ipAddress?: string; userAgent?: string }) {
    const eligibility = await this.checkEligibility(examId, studentId);
    if (!eligibility.eligible) {
      throw new Error(eligibility.reason || "Not eligible to take this exam.");
    }

    // If an active session already exists, resume it (recovery)
    if (eligibility.activeSessionId) {
      return await prisma.examSession.findUnique({
        where: { id: eligibility.activeSessionId },
        include: {
          sessionQuestions: {
            orderBy: { orderIndex: "asc" },
            include: {
              question: {
                select: {
                  id: true,
                  questionTextBn: true,
                  questionTextEn: true,
                  marks: true,
                  stemBn: true,
                  stemEn: true,
                  diagramUrl: true,
                  options: {
                    select: { id: true, optionKey: true, textBn: true, textEn: true, orderIndex: true },
                    orderBy: { orderIndex: "asc" },
                  },
                  subject: { select: { nameBn: true, nameEn: true } },
                  chapter: { select: { nameBn: true, nameEn: true, chapterNum: true } },
                },
              },
            },
          },
        },
      });
    }

    const exam = await prisma.exam.findUnique({
      where: { id: examId },
      include: {
        examQuestions: {
          include: {
            question: {
              select: {
                id: true,
                marks: true,
                negativeMarks: true,
              },
            },
          },
        },
      },
    });

    if (!exam || exam.examQuestions.length === 0) {
      throw new Error("Exam has no questions assigned.");
    }

    let questionsPool = [...exam.examQuestions];
    if (exam.randomizeQuestions) {
      questionsPool = questionsPool.sort(() => 0.5 - Math.random());
    }

    const serverStartTime = new Date();
    const serverDeadline = new Date(serverStartTime.getTime() + exam.durationMinutes * 60 * 1000);
    const attemptNumber = (eligibility.completedCount || 0) + 1;

    return await prisma.$transaction(async (tx) => {
      const session = await tx.examSession.create({
        data: {
          studentId,
          examId: exam.id,
          category: exam.category,
          mode: ExamMode.REAL_EXAM,
          status: ExamSessionStatus.IN_PROGRESS,
          durationMinutes: exam.durationMinutes,
          serverStartTime,
          serverDeadline,
          correctMark: 1.0,
          negativeMark: exam.negativeMarks,
          totalQuestions: questionsPool.length,
          attemptNumber,
          sessionQuestions: {
            create: questionsPool.map((eq, idx) => ({
              questionId: eq.questionId,
              orderIndex: idx + 1,
            })),
          },
        },
      });

      await tx.examAuditEvent.create({
        data: {
          examId: exam.id,
          sessionId: session.id,
          userId: studentId,
          action: "ATTEMPT_STARTED",
          ipAddress: reqMeta?.ipAddress,
          userAgent: reqMeta?.userAgent,
          metadataJson: JSON.stringify({ attemptNumber }),
        },
      });

      return session;
    });
  }

  // -------------------------------------------------------------------------
  // 3. PERSISTENT ANSWER AUTOSAVE & RECOVERY
  // -------------------------------------------------------------------------

  /**
   * Autosaves student answer for a single question.
   * Supports both positional and object arguments for 100% backwards compatibility.
   */
  static async saveAnswer(
    sessionIdOrParams: string | {
      sessionId: string;
      studentId: string;
      questionId: string;
      selectedOption?: string | null;
      writtenAnswer?: string | null;
      timeSpentSec?: number;
      isMarkedForReview?: boolean;
    },
    argStudentId?: string,
    argQuestionId?: string,
    argSelectedOption?: string | null,
    argTimeSpentSec?: number,
    argWrittenAnswer?: string | null,
    argIsMarkedForReview?: boolean
  ) {
    let sessionId: string;
    let studentId: string;
    let questionId: string;
    let selectedOption: string | null | undefined;
    let writtenAnswer: string | null | undefined;
    let timeSpentSec: number;
    let isMarkedForReview: boolean;

    if (typeof sessionIdOrParams === "object") {
      sessionId = sessionIdOrParams.sessionId;
      studentId = sessionIdOrParams.studentId;
      questionId = sessionIdOrParams.questionId;
      selectedOption = sessionIdOrParams.selectedOption ?? null;
      writtenAnswer = sessionIdOrParams.writtenAnswer ?? null;
      timeSpentSec = sessionIdOrParams.timeSpentSec ?? 0;
      isMarkedForReview = sessionIdOrParams.isMarkedForReview ?? false;
    } else {
      sessionId = sessionIdOrParams;
      studentId = argStudentId!;
      questionId = argQuestionId!;
      selectedOption = argSelectedOption ?? null;
      timeSpentSec = argTimeSpentSec ?? 0;
      writtenAnswer = argWrittenAnswer ?? null;
      isMarkedForReview = argIsMarkedForReview ?? false;
    }

    const session = await prisma.examSession.findFirst({
      where: { id: sessionId, studentId },
    });

    if (!session) {
      throw new Error("Unauthorized session access: Exam session not found or unauthorized");
    }

    if (session.status === ExamSessionStatus.SUBMITTED || session.status === ExamSessionStatus.EVALUATED) {
      throw new Error("Exam has already been submitted and finalized.");
    }

    // Server deadline enforcement: Grace period of 15 seconds for network transmission
    const graceMs = 15000;
    if (Date.now() > new Date(session.serverDeadline).getTime() + graceMs) {
      await prisma.examSession.update({
        where: { id: sessionId },
        data: {
          status: ExamSessionStatus.EXPIRED,
          finalizationReason: FinalizationReason.TIMEOUT_AUTO_SUBMIT,
        },
      });
      throw new Error("Exam time has expired.");
    }

    // Upsert student answer idempotently
    const answer = await prisma.studentAnswer.upsert({
      where: {
        sessionId_questionId: {
          sessionId,
          questionId,
        },
      },
      update: {
        selectedOption: selectedOption !== undefined ? selectedOption : undefined,
        writtenAnswer: writtenAnswer !== undefined ? writtenAnswer : undefined,
        isMarkedForReview,
        timeSpentSec,
        savedAt: new Date(),
      },
      create: {
        sessionId,
        questionId,
        selectedOption: selectedOption ?? null,
        writtenAnswer: writtenAnswer ?? null,
        isMarkedForReview,
        timeSpentSec,
      },
    });

    return answer;
  }

  // -------------------------------------------------------------------------
  // 4. SUBMISSION, AUTOMATIC GRADING, AND COHORT EVALUATION
  // -------------------------------------------------------------------------

  /**
   * Evaluates and finalizes an exam submission with objective scoring,
   * negative marking, cohort rankings, and mistake tracking.
   */
  static async submitAndEvaluateExam(params: SubmitExamParams) {
    const { sessionId, studentId, answers, finalizationReason = FinalizationReason.STUDENT_SUBMIT } = params;

    const session = await prisma.examSession.findFirst({
      where: { id: sessionId, studentId },
      include: {
        exam: true,
        template: true,
        sessionQuestions: {
          include: {
            question: {
              include: {
                answer: true,
                subject: true,
                chapter: true,
              },
            },
          },
        },
        result: true,
        studentAnswers: true,
      },
    });

    if (!session) {
      throw new Error("Exam session not found");
    }

    // Idempotency: If already evaluated, return existing result
    if (session.status === ExamSessionStatus.EVALUATED && session.result) {
      return { session, result: session.result, alreadyEvaluated: true };
    }

    const answersMap = new Map<string, string | null>();
    const writtenMap = new Map<string, string | null>();
    const timeSpentMap = new Map<string, number>();

    if (session.studentAnswers) {
      for (const sa of session.studentAnswers) {
        if (sa.selectedOption !== undefined) answersMap.set(sa.questionId, sa.selectedOption);
        if (sa.writtenAnswer !== undefined) writtenMap.set(sa.questionId, sa.writtenAnswer);
        if (sa.timeSpentSec !== undefined) timeSpentMap.set(sa.questionId, sa.timeSpentSec);
      }
    }

    for (const a of answers || []) {
      if (a.selectedOption !== undefined) answersMap.set(a.questionId, a.selectedOption ?? null);
      if (a.writtenAnswer !== undefined) {
        writtenMap.set(a.questionId, a.writtenAnswer);
      }
      if (a.timeSpentSec !== undefined) timeSpentMap.set(a.questionId, a.timeSpentSec ?? 0);
    }

    let correctCount = 0;
    let incorrectCount = 0;
    let unansweredCount = 0;
    let totalTimeSpent = 0;

    const subjectStats: Record<string, { total: number; correct: number; incorrect: number }> = {};
    const chapterStats: Record<string, { total: number; correct: number; incorrect: number }> = {};
    const wrongQuestionIds: string[] = [];

    // Calculate score against verified database keys
    for (const sq of session.sessionQuestions) {
      const q = sq.question;
      const studentSelected = answersMap.get(q.id) ?? null;
      const writtenAns = writtenMap.get(q.id) ?? null;
      const spentSec = timeSpentMap.get(q.id) ?? 0;
      totalTimeSpent += spentSec;

      const subName = q.subject?.nameBn || "সাধারণ";
      if (!subjectStats[subName]) {
        subjectStats[subName] = { total: 0, correct: 0, incorrect: 0 };
      }
      subjectStats[subName].total += 1;

      const chapName = q.chapter?.nameBn || "সাধারণ";
      if (!chapterStats[chapName]) {
        chapterStats[chapName] = { total: 0, correct: 0, incorrect: 0 };
      }
      chapterStats[chapName].total += 1;

      const isCorrect = studentSelected !== null && studentSelected === q.answer?.correctKey;

      if ((studentSelected === null || studentSelected === "") && (writtenAns === null || writtenAns === "")) {
        unansweredCount += 1;
      } else if (isCorrect) {
        correctCount += 1;
        subjectStats[subName].correct += 1;
        chapterStats[chapName].correct += 1;
      } else {
        incorrectCount += 1;
        subjectStats[subName].incorrect += 1;
        chapterStats[chapName].incorrect += 1;
        wrongQuestionIds.push(q.id);
      }
    }

    const maxMarks = session.totalQuestions * session.correctMark;
    const rawScore = correctCount * session.correctMark - incorrectCount * session.negativeMark;
    const finalScore = Math.max(0, parseFloat(rawScore.toFixed(2)));
    const totalAttempted = correctCount + incorrectCount;
    const accuracyPct = totalAttempted > 0 ? parseFloat(((correctCount / totalAttempted) * 100).toFixed(1)) : 0;

    // Pass / Fail Determination
    const passThreshold = session.exam?.passMarks ?? maxMarks * 0.4;
    const isPassed = finalScore >= passThreshold;

    // Result Publication Policy
    let isPublished = true;
    if (session.exam) {
      if (session.exam.releasePolicy === ResultReleasePolicy.MANUAL) {
        isPublished = session.exam.isResultsReleased;
      } else if (session.exam.releasePolicy === ResultReleasePolicy.AFTER_EXAM_WINDOW) {
        isPublished = session.exam.endDate ? new Date() >= new Date(session.exam.endDate) : true;
      }
    }

    return await prisma.$transaction(async (tx) => {
      // 1. Persist student answers
      for (const sq of session.sessionQuestions) {
        const q = sq.question;
        const studentSelected = answersMap.get(q.id) ?? null;
        const writtenAns = writtenMap.get(q.id) ?? null;
        const spentSec = timeSpentMap.get(q.id) ?? 0;
        const isCorrect = studentSelected !== null && studentSelected === q.answer?.correctKey;

        await tx.studentAnswer.upsert({
          where: { sessionId_questionId: { sessionId, questionId: q.id } },
          update: {
            selectedOption: studentSelected,
            writtenAnswer: writtenAns,
            isCorrect,
            marksObtained: isCorrect ? session.correctMark : 0,
            timeSpentSec: spentSec,
          },
          create: {
            sessionId,
            questionId: q.id,
            selectedOption: studentSelected,
            writtenAnswer: writtenAns,
            isCorrect,
            marksObtained: isCorrect ? session.correctMark : 0,
            timeSpentSec: spentSec,
          },
        });
      }

      // 2. Mark session as evaluated
      const submittedAt = new Date();
      await tx.examSession.update({
        where: { id: sessionId },
        data: {
          status: ExamSessionStatus.EVALUATED,
          submittedAt,
          finalizationReason,
        },
      });

      // 3. Compute Cohort Ranking & Percentile
      let cohortWhere: Record<string, unknown> = {
        session: { category: session.category },
      };
      if (session.examId) {
        cohortWhere = { session: { examId: session.examId } };
      } else if (session.templateId) {
        cohortWhere = { session: { templateId: session.templateId } };
      }

      const otherResults = await tx.examResult.findMany({
        where: cohortWhere,
        select: { totalScore: true },
      });

      const higherScoresCount = otherResults.filter((r) => r.totalScore > finalScore).length;
      const cohortSize = otherResults.length + 1;
      const rankInCohort = higherScoresCount + 1;
      const percentile = Math.round(((cohortSize - rankInCohort + 1) / cohortSize) * 1000) / 10;

      // 4. Create ExamResult
      const result = await tx.examResult.create({
        data: {
          sessionId,
          studentId,
          totalScore: finalScore,
          maxMarks,
          correctCount,
          incorrectCount,
          unansweredCount,
          accuracyPct,
          timeSpentSec: totalTimeSpent,
          rankInCohort,
          cohortSize,
          percentile,
          isPassed,
          isPublished,
          subjectBreakdownJson: JSON.stringify(subjectStats),
          chapterBreakdownJson: JSON.stringify(chapterStats),
        },
      });

      // 5. Store wrong answers in WrongQuestion notebook
      for (const wqId of wrongQuestionIds) {
        await tx.wrongQuestion.upsert({
          where: {
            studentId_questionId: {
              studentId,
              questionId: wqId,
            },
          },
          update: {
            mistakeCount: { increment: 1 },
            lastMistake: new Date(),
            isMastered: false,
          },
          create: {
            studentId,
            questionId: wqId,
            mistakeCount: 1,
            isMastered: false,
          },
        });
      }

      // 6. Update study activity and streak
      await tx.studyActivity.create({
        data: {
          studentId,
          activityType: "EXAM_TAKEN",
          durationMin: Math.max(1, Math.round(totalTimeSpent / 60)),
        },
      });

      // 7. Audit log
      await tx.examAuditEvent.create({
        data: {
          examId: session.examId,
          sessionId,
          userId: studentId,
          action: "EXAM_SUBMITTED",
          metadataJson: JSON.stringify({
            finalizationReason,
            totalScore: finalScore,
            rankInCohort,
          }),
        },
      });

      return { session, result, alreadyEvaluated: false };
    });
  }

  // -------------------------------------------------------------------------
  // 5. MANUAL GRADING QUEUE & REGRADING CONTROLS
  // -------------------------------------------------------------------------

  /**
   * Retrieves answers awaiting manual subjective evaluation.
   */
  static async getManualGradingQueue(params?: {
    examId?: string;
    status?: "PENDING" | "GRADED";
    page?: number;
    limit?: number;
  }) {
    const { examId, status = "PENDING", page = 1, limit = 50 } = params || {};
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {
      writtenAnswer: { not: null },
      ...(status === "PENDING" ? { manualGrade: null } : { manualGrade: { isNot: null } }),
      session: {
        status: { in: [ExamSessionStatus.SUBMITTED, ExamSessionStatus.EVALUATED] },
        ...(examId ? { examId } : {}),
      },
    };

    const pendingAnswers = await prisma.studentAnswer.findMany({
      where,
      include: {
        question: {
          include: {
            subparts: { orderBy: { orderIndex: "asc" } },
            subject: true,
            chapter: true,
          },
        },
        session: {
          select: {
            id: true,
            student: { select: { id: true, fullName: true, fullNameBn: true } },
            exam: { select: { titleBn: true, titleEn: true } },
          },
        },
      },
      take: 50,
      orderBy: { savedAt: "asc" },
    });

    const items = pendingAnswers.map((a) => ({
      id: a.id,
      answerId: a.id,
      sessionId: a.sessionId,
      questionId: a.question.id,
      examTitle: a.session.exam?.titleBn || "মডেল টেস্ট",
      studentName: a.session.student.fullNameBn || a.session.student.fullName,
      questionTextBn: a.question.questionTextBn,
      stemBn: a.question.stemBn,
      writtenAnswer: a.writtenAnswer,
      maxMarks: a.question.marks,
      subparts: a.question.subparts,
      savedAt: a.savedAt,
    }));

    Object.assign(items, { items, total: items.length });
    return items as typeof items & { items: typeof items; total: number };
  }

  /**
   * Applies manual marks & feedback to a subjective answer and updates total result.
   */
  static async gradeSubjectiveAnswer(params: {
    answerId?: string;
    studentAnswerId?: string;
    graderId: string;
    marksAwarded: number;
    rubricFeedback?: string;
    feedback?: string;
    reviewNotes?: string;
  }) {
    const answerId = params.answerId || params.studentAnswerId;
    const rubricFeedback = params.rubricFeedback || params.feedback;
    const { graderId, marksAwarded, reviewNotes } = params;

    if (!answerId) {
      throw new Error("Missing answerId or studentAnswerId");
    }

    const answer = await prisma.studentAnswer.findUnique({
      where: { id: answerId },
      include: {
        question: true,
        session: { include: { result: true } },
      },
    });

    if (!answer) {
      throw new Error("Student answer not found");
    }

    if (marksAwarded > answer.question.marks) {
      throw new Error(`Marks awarded (${marksAwarded}) cannot exceed question max marks (${answer.question.marks}).`);
    }

    return await prisma.$transaction(async (tx) => {
      // 1. Create or update ManualGrade
      const grade = await tx.manualGrade.upsert({
        where: { answerId },
        update: {
          graderId,
          marksAwarded,
          maxMarks: answer.question.marks,
          rubricFeedback,
          reviewNotes,
          gradedAt: new Date(),
        },
        create: {
          answerId,
          graderId,
          marksAwarded,
          maxMarks: answer.question.marks,
          rubricFeedback,
          reviewNotes,
        },
      });

      // 2. Update StudentAnswer
      await tx.studentAnswer.update({
        where: { id: answerId },
        data: {
          marksObtained: marksAwarded,
          isCorrect: marksAwarded > 0,
        },
      });

      // 3. Recalculate ExamResult totalScore
      if (answer.session.result) {
        const allAnswers = await tx.studentAnswer.findMany({
          where: { sessionId: answer.sessionId },
          select: { marksObtained: true },
        });

        const totalEarned = allAnswers.reduce((sum, a) => sum + (a.marksObtained || 0), 0);
        const passThreshold = answer.session.result.maxMarks * 0.4;

        await tx.examResult.update({
          where: { sessionId: answer.sessionId },
          data: {
            totalScore: parseFloat(totalEarned.toFixed(2)),
            isPassed: totalEarned >= passThreshold,
          },
        });
      }

      // 4. Audit Log
      await tx.examAuditEvent.create({
        data: {
          examId: answer.session.examId,
          sessionId: answer.sessionId,
          userId: graderId,
          action: "MANUAL_GRADED",
          metadataJson: JSON.stringify({ answerId, marksAwarded }),
        },
      });

      return grade;
    });
  }

  /**
   * Regrades an exam session and records an audit log.
   */
  static async regradeExamSession(params: { sessionId: string; graderId: string; reason: string }) {
    const { sessionId, graderId, reason } = params;

    const session = await prisma.examSession.findUnique({
      where: { id: sessionId },
      include: {
        sessionQuestions: { include: { question: { include: { answer: true } } } },
        studentAnswers: true,
        result: true,
      },
    });

    if (!session || !session.result) {
      throw new Error("Exam session or result not found for regrading.");
    }

    return await prisma.$transaction(async (tx) => {
      let correctCount = 0;
      let incorrectCount = 0;
      let unansweredCount = 0;

      for (const sq of session.sessionQuestions) {
        const ans = session.studentAnswers.find((a) => a.questionId === sq.questionId);
        const isCorrect = ans?.selectedOption && ans.selectedOption === sq.question.answer?.correctKey;

        if (!ans?.selectedOption) {
          unansweredCount++;
        } else if (isCorrect) {
          correctCount++;
          await tx.studentAnswer.update({
            where: { id: ans.id },
            data: { isCorrect: true, marksObtained: session.correctMark },
          });
        } else {
          incorrectCount++;
          await tx.studentAnswer.update({
            where: { id: ans.id },
            data: { isCorrect: false, marksObtained: 0 },
          });
        }
      }

      const rawScore = correctCount * session.correctMark - incorrectCount * session.negativeMark;
      const totalScore = Math.max(0, parseFloat(rawScore.toFixed(2)));

      const updatedResult = await tx.examResult.update({
        where: { sessionId },
        data: {
          totalScore,
          correctCount,
          incorrectCount,
          unansweredCount,
          regradedAt: new Date(),
          regradeReason: reason,
          regradedBy: graderId,
        },
      });

      await tx.examAuditEvent.create({
        data: {
          examId: session.examId,
          sessionId,
          userId: graderId,
          action: "REGRADED",
          metadataJson: JSON.stringify({ reason, previousScore: session.result?.totalScore, newScore: totalScore }),
        },
      });

      return updatedResult;
    });
  }

  // -------------------------------------------------------------------------
  // 6. WRONG-ANSWER REVISION DRIVER
  // -------------------------------------------------------------------------

  /**
   * Creates a dedicated practice drill using questions the student previously answered incorrectly.
   */
  static async createWrongAnswerPracticeSession(
    arg1:
      | string
      | {
          studentId: string;
          category: ExamCategoryType;
          subjectId?: string;
          chapterId?: string;
          limit?: number;
        },
    arg2?: {
      category: ExamCategoryType;
      subjectId?: string;
      chapterId?: string;
      limit?: number;
    }
  ) {
    const params = typeof arg1 === "string" ? { studentId: arg1, ...arg2! } : arg1;
    const { studentId, category, subjectId, chapterId, limit = 15 } = params;

    const where: Record<string, unknown> = {
      studentId,
      isMastered: false,
      question: {
        category,
        status: ContentStatus.PUBLISHED,
        ...(subjectId ? { subjectId } : {}),
        ...(chapterId ? { chapterId } : {}),
      },
    };

    const wrongList = await prisma.wrongQuestion.findMany({
      where,
      take: limit,
      include: {
        question: {
          select: { id: true, marks: true, negativeMarks: true },
        },
      },
      orderBy: { lastMistake: "desc" },
    });

    if (wrongList.length === 0) {
      throw new Error("No unmastered mistakes found matching your criteria.");
    }

    const durationMinutes = Math.max(10, Math.round(wrongList.length * 1.5));
    const serverStartTime = new Date();
    const serverDeadline = new Date(serverStartTime.getTime() + durationMinutes * 60 * 1000);

    return await prisma.$transaction(async (tx) => {
      const session = await tx.examSession.create({
        data: {
          studentId,
          category,
          mode: ExamMode.PRACTICE,
          status: ExamSessionStatus.IN_PROGRESS,
          durationMinutes,
          serverStartTime,
          serverDeadline,
          correctMark: 1.0,
          negativeMark: 0.25,
          totalQuestions: wrongList.length,
          sessionQuestions: {
            create: wrongList.map((w, idx) => ({
              questionId: w.question.id,
              orderIndex: idx + 1,
            })),
          },
        },
      });

      return session;
    });
  }

  // -------------------------------------------------------------------------
  // 7. TIMEOUT AUTO-SUBMISSION CRON / WORKER
  // -------------------------------------------------------------------------

  /**
   * Finalizes sessions whose server deadline plus grace period has passed.
   */
  static async autoFinalizeExpiredSessions() {
    const now = new Date();
    const graceMs = 15000;
    const cutoff = new Date(now.getTime() - graceMs);

    const expiredSessions = await prisma.examSession.findMany({
      where: {
        status: ExamSessionStatus.IN_PROGRESS,
        serverDeadline: { lt: cutoff },
      },
      take: 20,
    });

    let finalizedCount = 0;
    for (const session of expiredSessions) {
      const answers = await prisma.studentAnswer.findMany({
        where: { sessionId: session.id },
      });

      await this.submitAndEvaluateExam({
        sessionId: session.id,
        studentId: session.studentId,
        answers: answers.map((a) => ({
          questionId: a.questionId,
          selectedOption: a.selectedOption,
          writtenAnswer: a.writtenAnswer,
          timeSpentSec: a.timeSpentSec,
        })),
        finalizationReason: FinalizationReason.TIMEOUT_AUTO_SUBMIT,
      });

      finalizedCount++;
    }

    return { finalizedCount };
  }

  // -------------------------------------------------------------------------
  // 8. TEMPLATES, CUSTOM BUILDER & LEADERBOARD (PRESERVED)
  // -------------------------------------------------------------------------

  static async listExamTemplates(params?: {
    category?: ExamCategoryType;
    isPremium?: boolean;
    studentId?: string;
  }) {
    const { category, isPremium, studentId } = params || {};

    const templates = await prisma.examTemplate.findMany({
      where: {
        isPublished: true,
        ...(category ? { category } : {}),
        ...(isPremium !== undefined ? { isPremium } : {}),
      },
      orderBy: { createdAt: "desc" },
      include: {
        sessions: {
          where: studentId
            ? { studentId, status: ExamSessionStatus.EVALUATED }
            : { id: "none" },
          include: { result: true },
          orderBy: { submittedAt: "desc" },
          take: 1,
        },
        _count: { select: { sessions: true } },
      },
    });

    return templates.map((t) => {
      const studentSession = t.sessions?.[0];
      return {
        id: t.id,
        titleBn: t.titleBn,
        titleEn: t.titleEn,
        category: t.category,
        subjectId: t.subjectId,
        durationMinutes: t.durationMinutes,
        totalMarks: t.totalMarks,
        negativeMarks: t.negativeMarks,
        questionCount: t.questionCount,
        isPremium: t.isPremium,
        mode: t.mode,
        instructionsBn: t.instructionsBn,
        instructionsEn: t.instructionsEn,
        totalAttempts: t._count?.sessions || 0,
        studentBestScore: studentSession?.result?.totalScore ?? null,
        isAttempted: Boolean(studentSession),
        lastAttemptSessionId: studentSession?.id ?? null,
      };
    });
  }

  static async createExamFromTemplate(templateId: string, studentId: string) {
    const template = await prisma.examTemplate.findUnique({
      where: { id: templateId },
    });

    if (!template || !template.isPublished) {
      throw new Error("Exam template not found or unpublished.");
    }

    if (template.isPremium) {
      const sub = await prisma.subscription.findFirst({
        where: {
          studentId,
          status: SubscriptionStatus.ACTIVE,
          endDate: { gte: new Date() },
        },
      });
      if (!sub) {
        throw new Error("This model test requires an active premium subscription.");
      }
    }

    const whereClause: Record<string, unknown> = {
      category: template.category,
      status: ContentStatus.PUBLISHED,
    };
    if (template.subjectId) {
      whereClause.subjectId = template.subjectId;
    }

    const eligibleQuestions = await prisma.question.findMany({
      where: whereClause,
      select: { id: true, marks: true, negativeMarks: true },
    });

    if (eligibleQuestions.length === 0) {
      throw new Error("No published questions available for this exam template.");
    }

    const shuffled = [...eligibleQuestions].sort(() => 0.5 - Math.random());
    const selectedQuestions = shuffled.slice(0, Math.min(template.questionCount, shuffled.length));

    const serverStartTime = new Date();
    const serverDeadline = new Date(serverStartTime.getTime() + template.durationMinutes * 60 * 1000);

    const defaultCorrectMark = selectedQuestions[0]?.marks ?? 1.0;
    const defaultNegativeMark = template.negativeMarks ?? 0.25;

    return prisma.$transaction(async (tx) => {
      const session = await tx.examSession.create({
        data: {
          studentId,
          templateId: template.id,
          category: template.category,
          mode: template.mode,
          status: ExamSessionStatus.IN_PROGRESS,
          durationMinutes: template.durationMinutes,
          serverStartTime,
          serverDeadline,
          correctMark: defaultCorrectMark,
          negativeMark: defaultNegativeMark,
          totalQuestions: selectedQuestions.length,
          sessionQuestions: {
            create: selectedQuestions.map((q, idx) => ({
              questionId: q.id,
              orderIndex: idx + 1,
            })),
          },
        },
      });

      return session;
    });
  }

  static async createCustomExam(params: CreateExamParams) {
    const {
      studentId,
      category,
      subjectId,
      paperId,
      chapterIds,
      questionCount,
      durationMinutes,
      difficulty,
      mode,
      adaptive = false,
    } = params;

    const whereClause: Record<string, unknown> = {
      category,
      subjectId,
      status: ContentStatus.PUBLISHED,
    };

    if (paperId) whereClause.paperId = paperId;
    if (chapterIds && chapterIds.length > 0) whereClause.chapterId = { in: chapterIds };
    if (difficulty !== "MIXED") whereClause.difficulty = difficulty as DifficultyLevel;

    let priorityQuestionIds: string[] = [];
    if (adaptive && studentId) {
      const unmastered = await prisma.wrongQuestion.findMany({
        where: {
          studentId,
          isMastered: false,
          question: whereClause,
        },
        select: { questionId: true },
        take: Math.floor(questionCount * 0.5),
      });
      priorityQuestionIds = unmastered.map((w) => w.questionId);
    }

    const eligibleQuestions = await prisma.question.findMany({
      where: whereClause,
      select: { id: true, marks: true, negativeMarks: true },
    });

    if (eligibleQuestions.length === 0) {
      throw new Error("No published questions found matching your criteria.");
    }

    const prioritySet = new Set(priorityQuestionIds);
    const prioritizedPool = eligibleQuestions.filter((q) => prioritySet.has(q.id));
    const regularPool = eligibleQuestions
      .filter((q) => !prioritySet.has(q.id))
      .sort(() => 0.5 - Math.random());

    const neededRegular = questionCount - prioritizedPool.length;
    const selectedQuestions = [...prioritizedPool, ...regularPool.slice(0, Math.max(0, neededRegular))];

    const serverStartTime = new Date();
    const serverDeadline = new Date(serverStartTime.getTime() + durationMinutes * 60 * 1000);

    const defaultCorrectMark = 1.0;
    const defaultNegativeMark = 0.25;

    return prisma.$transaction(async (tx) => {
      const session = await tx.examSession.create({
        data: {
          studentId,
          category,
          mode,
          status: ExamSessionStatus.IN_PROGRESS,
          durationMinutes,
          serverStartTime,
          serverDeadline,
          correctMark: defaultCorrectMark,
          negativeMark: defaultNegativeMark,
          totalQuestions: selectedQuestions.length,
          sessionQuestions: {
            create: selectedQuestions.map((q, idx) => ({
              questionId: q.id,
              orderIndex: idx + 1,
            })),
          },
        },
      });

      return session;
    });
  }

  static async getExamLeaderboard(params: {
    templateId?: string;
    examId?: string;
    category?: ExamCategoryType;
    limit?: number;
  }) {
    const { templateId, examId, category, limit = 10 } = params;

    const where: Record<string, unknown> = {};
    if (examId) {
      where.session = { examId };
    } else if (templateId) {
      where.session = { templateId };
    } else if (category) {
      where.session = { category };
    }

    const topResults = await prisma.examResult.findMany({
      where,
      orderBy: [{ totalScore: "desc" }, { timeSpentSec: "asc" }],
      take: limit,
      include: {
        student: {
          select: {
            id: true,
            fullName: true,
            fullNameBn: true,
            avatarUrl: true,
          },
        },
        session: {
          select: {
            category: true,
            mode: true,
            exam: { select: { titleBn: true, titleEn: true } },
            template: { select: { titleBn: true, titleEn: true } },
          },
        },
      },
    });

    return topResults.map((r, idx) => ({
      rank: idx + 1,
      studentName: r.student.fullNameBn || r.student.fullName,
      avatarUrl: r.student.avatarUrl,
      score: r.totalScore,
      maxMarks: r.maxMarks,
      accuracyPct: r.accuracyPct,
      timeSpentSec: r.timeSpentSec,
      examTitle: r.session.exam?.titleBn || r.session.template?.titleBn || `${r.session.category} মডেল টেস্ট`,
      evaluatedAt: r.evaluatedAt,
    }));
  }

  static async getStudentExamHistory(studentId: string, limit = 15) {
    const sessions = await prisma.examSession.findMany({
      where: {
        studentId,
        status: ExamSessionStatus.EVALUATED,
      },
      orderBy: { submittedAt: "desc" },
      take: limit,
      include: {
        result: true,
        exam: { select: { titleBn: true, titleEn: true } },
        template: { select: { titleBn: true, titleEn: true } },
      },
    });

    return sessions.map((s) => ({
      id: s.id,
      category: s.category,
      mode: s.mode,
      durationMinutes: s.durationMinutes,
      totalQuestions: s.totalQuestions,
      submittedAt: s.submittedAt,
      templateTitle: s.exam?.titleBn || s.template?.titleBn || null,
      result: s.result,
    }));
  }
}
