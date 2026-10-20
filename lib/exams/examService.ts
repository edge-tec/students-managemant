import prisma from "@/lib/db/prisma";
import { ExamCategoryType, ExamMode, ExamSessionStatus, DifficultyLevel, ContentStatus } from "@prisma/client";

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
   * Builds and persists a new server-authoritative exam session with selected questions.
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
    } = params;

    // Build Prisma where query for questions
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

    // Shuffle and pick requested count
    const shuffled = [...eligibleQuestions].sort(() => 0.5 - Math.random());
    const selectedQuestions = shuffled.slice(0, Math.min(questionCount, shuffled.length));

    const serverStartTime = new Date();
    const serverDeadline = new Date(serverStartTime.getTime() + durationMinutes * 60 * 1000);

    const defaultCorrectMark = selectedQuestions[0]?.marks ?? 1.0;
    const defaultNegativeMark = selectedQuestions[0]?.negativeMarks ?? 0.25;

    // Create ExamSession and link session questions inside transaction
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
  static async saveAnswer(sessionId: string, studentId: string, questionId: string, selectedOption: string | null, timeSpentSec: number) {
    const session = await prisma.examSession.findFirst({
      where: { id: sessionId, studentId },
    });

    if (!session) {
      throw new Error("Exam session not found or unauthorized");
    }

    if (session.status === ExamSessionStatus.SUBMITTED || session.status === ExamSessionStatus.EVALUATED) {
      throw new Error("Exam has already been submitted");
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
   * Evaluates and finalizes an exam submission.
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

      // 3. Create ExamResult
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
          subjectBreakdownJson: JSON.stringify(subjectStats),
          chapterBreakdownJson: JSON.stringify(chapterStats),
        },
      });

      // 4. Automatically save wrong answers to student's WrongQuestion notebook
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

      // 5. Update study activity and streak
      await tx.studyActivity.create({
        data: {
          studentId,
          activityType: "EXAM_TAKEN",
          durationMin: Math.max(1, Math.round(totalTimeSpent / 60)),
        },
      });

      // Streak update
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
}
