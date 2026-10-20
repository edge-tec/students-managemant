import prisma from "@/lib/db/prisma";
import {
  ExamCategoryType,
  ExamMode,
  ExamSessionStatus,
  DifficultyLevel,
  ContentStatus,
  SubscriptionStatus,
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
    selectedOption: string | null;
    timeSpentSec: number;
  }[];
}

export class ExamService {
  /**
   * Lists available Exam Templates (Live Model Tests, Past Board Papers)
   */
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

  /**
   * Starts a new exam session from an existing ExamTemplate (Live Model Test or Past Board Paper).
   */
  static async createExamFromTemplate(templateId: string, studentId: string) {
    const template = await prisma.examTemplate.findUnique({
      where: { id: templateId },
    });

    if (!template || !template.isPublished) {
      throw new Error("Exam template not found or unpublished.");
    }

    // Check premium access if required
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

    // Fetch questions matching template category & subject
    const whereClause: Record<string, unknown> = {
      category: template.category,
      status: ContentStatus.PUBLISHED,
    };
    if (template.subjectId) {
      whereClause.subjectId = template.subjectId;
    }

    const eligibleQuestions = await prisma.question.findMany({
      where: whereClause,
      select: {
        id: true,
        marks: true,
        negativeMarks: true,
      },
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

  /**
   * Builds and persists a custom exam session with adaptive knowledge-gap targeting.
   */
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

    if (paperId) {
      whereClause.paperId = paperId;
    }

    if (chapterIds && chapterIds.length > 0) {
      whereClause.chapterId = { in: chapterIds };
    }

    if (difficulty !== "MIXED") {
      whereClause.difficulty = difficulty as DifficultyLevel;
    }

    // Adaptive Mode: Prioritize student's previously unmastered wrong questions
    let priorityQuestionIds: string[] = [];
    if (adaptive && studentId) {
      const unmastered = await prisma.wrongQuestion.findMany({
        where: {
          studentId,
          isMastered: false,
          question: whereClause,
        },
        select: { questionId: true },
        take: Math.floor(questionCount * 0.5), // up to 50% from mistakes
      });
      priorityQuestionIds = unmastered.map((w) => w.questionId);
    }

    // Fetch eligible questions with options
    const eligibleQuestions = await prisma.question.findMany({
      where: whereClause,
      select: {
        id: true,
        marks: true,
        negativeMarks: true,
      },
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

    const defaultCorrectMark = selectedQuestions[0]?.marks ?? 1.0;
    const defaultNegativeMark = selectedQuestions[0]?.negativeMarks ?? 0.25;

    const session = await prisma.$transaction(async (tx) => {
      const newSession = await tx.examSession.create({
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

      return newSession;
    });

    return session;
  }

  /**
   * Autosaves student answer for a single question.
   */
  static async saveAnswer(
    sessionId: string,
    studentId: string,
    questionId: string,
    selectedOption: string | null,
    timeSpentSec: number
  ) {
    const session = await prisma.examSession.findFirst({
      where: { id: sessionId, studentId },
    });

    if (!session) {
      throw new Error("Exam session not found or unauthorized");
    }

    if (session.status === ExamSessionStatus.SUBMITTED || session.status === ExamSessionStatus.EVALUATED) {
      throw new Error("Exam has already been submitted");
    }

    // Server deadline enforcement: Grace period of 15 seconds
    const graceMs = 15000;
    if (Date.now() > new Date(session.serverDeadline).getTime() + graceMs) {
      await prisma.examSession.update({
        where: { id: sessionId },
        data: { status: ExamSessionStatus.EXPIRED },
      });
      throw new Error("Exam time has expired.");
    }

    // Upsert student answer
    const answer = await prisma.studentAnswer.upsert({
      where: {
        sessionId_questionId: {
          sessionId,
          questionId,
        },
      },
      update: {
        selectedOption,
        timeSpentSec,
        savedAt: new Date(),
      },
      create: {
        sessionId,
        questionId,
        selectedOption,
        timeSpentSec,
      },
    });

    return answer;
  }

  /**
   * Evaluates and finalizes an exam submission with cohort ranking & percentile calculations.
   */
  static async submitAndEvaluateExam(params: SubmitExamParams) {
    const { sessionId, studentId, answers } = params;

    const session = await prisma.examSession.findFirst({
      where: { id: sessionId, studentId },
      include: {
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
    const timeSpentMap = new Map<string, number>();
    for (const a of answers) {
      answersMap.set(a.questionId, a.selectedOption);
      timeSpentMap.set(a.questionId, a.timeSpentSec);
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
      const spentSec = timeSpentMap.get(q.id) ?? 0;
      totalTimeSpent += spentSec;

      const subName = q.subject.nameBn;
      if (!subjectStats[subName]) {
        subjectStats[subName] = { total: 0, correct: 0, incorrect: 0 };
      }
      subjectStats[subName].total += 1;

      const chapName = q.chapter.nameBn;
      if (!chapterStats[chapName]) {
        chapterStats[chapName] = { total: 0, correct: 0, incorrect: 0 };
      }
      chapterStats[chapName].total += 1;

      const isCorrect = studentSelected !== null && studentSelected === q.answer?.correctKey;

      if (studentSelected === null || studentSelected === "") {
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

    return await prisma.$transaction(async (tx) => {
      // 1. Persist or update all student answers
      for (const sq of session.sessionQuestions) {
        const q = sq.question;
        const studentSelected = answersMap.get(q.id) ?? null;
        const spentSec = timeSpentMap.get(q.id) ?? 0;
        const isCorrect = studentSelected !== null && studentSelected === q.answer?.correctKey;

        await tx.studentAnswer.upsert({
          where: { sessionId_questionId: { sessionId, questionId: q.id } },
          update: { selectedOption: studentSelected, isCorrect, timeSpentSec: spentSec },
          create: { sessionId, questionId: q.id, selectedOption: studentSelected, isCorrect, timeSpentSec: spentSec },
        });
      }

      // 2. Mark session as evaluated
      const submittedAt = new Date();
      await tx.examSession.update({
        where: { id: sessionId },
        data: {
          status: ExamSessionStatus.EVALUATED,
          submittedAt,
        },
      });

      // 3. Compute Cohort Ranking & Percentile
      let cohortWhere: Record<string, unknown> = {
        session: { category: session.category },
      };
      if (session.templateId) {
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
          subjectBreakdownJson: JSON.stringify(subjectStats),
          chapterBreakdownJson: JSON.stringify(chapterStats),
        },
      });

      // 5. Automatically save wrong answers to student's WrongQuestion notebook
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

      // 7. Streak update
      const existingStreak = await tx.studyStreak.findUnique({
        where: { studentId },
      });

      const today = new Date();
      if (!existingStreak) {
        await tx.studyStreak.create({
          data: {
            studentId,
            currentStreak: 1,
            longestStreak: 1,
            lastActiveDay: today,
          },
        });
      } else {
        const lastActive = new Date(existingStreak.lastActiveDay);
        const diffDays = Math.floor((today.getTime() - lastActive.getTime()) / (1000 * 3600 * 24));
        if (diffDays === 1) {
          const nextStreak = existingStreak.currentStreak + 1;
          await tx.studyStreak.update({
            where: { studentId },
            data: {
              currentStreak: nextStreak,
              longestStreak: Math.max(nextStreak, existingStreak.longestStreak),
              lastActiveDay: today,
            },
          });
        } else if (diffDays > 1) {
          await tx.studyStreak.update({
            where: { studentId },
            data: {
              currentStreak: 1,
              lastActiveDay: today,
            },
          });
        }
      }

      return { session, result, alreadyEvaluated: false };
    });
  }

  /**
   * Retrieves real-time merit list / leaderboard for an ExamTemplate or Category.
   */
  static async getExamLeaderboard(params: { templateId?: string; category?: ExamCategoryType; limit?: number }) {
    const { templateId, category, limit = 10 } = params;

    const where: Record<string, unknown> = {};
    if (templateId) {
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
      examTitle: r.session.template?.titleBn || `${r.session.category} মডেল টেস্ট`,
      evaluatedAt: r.evaluatedAt,
    }));
  }

  /**
   * Retrieves a student's past completed exam sessions.
   */
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
      templateTitle: s.template?.titleBn || null,
      result: s.result,
    }));
  }
}
