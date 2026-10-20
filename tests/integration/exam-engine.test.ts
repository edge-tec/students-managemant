import { describe, it, expect, beforeAll, afterAll } from "vitest";
import prisma from "@/lib/db/prisma";
import { ExamService } from "@/lib/exams/examService";
import { ExamCategoryType, ExamMode } from "@prisma/client";

describe("Examination Engine Integration Tests", () => {
  let testStudentId: string;
  let testSubjectId: string;
  let testSessionId: string;

  beforeAll(async () => {
    // Find seeded student and subject
    const student = await prisma.user.findFirst({
      where: { email: "student@edubd.ac" },
    });
    if (!student) throw new Error("Seed student not found");
    testStudentId = student.id;

    const subject = await prisma.subject.findFirst({
      where: { category: ExamCategoryType.HSC },
    });
    if (!subject) throw new Error("Seed subject not found");
    testSubjectId = subject.id;
  });

  afterAll(async () => {
    // Cleanup created test session
    if (testSessionId) {
      await prisma.studentAnswer.deleteMany({ where: { sessionId: testSessionId } });
      await prisma.examResult.deleteMany({ where: { sessionId: testSessionId } });
      await prisma.examSessionQuestion.deleteMany({ where: { sessionId: testSessionId } });
      await prisma.examSession.deleteMany({ where: { id: testSessionId } });
    }
  });

  it("should create a server-authoritative custom exam session with deadline and questions", async () => {
    const session = await ExamService.createCustomExam({
      studentId: testStudentId,
      category: ExamCategoryType.HSC,
      subjectId: testSubjectId,
      chapterIds: [],
      questionCount: 2,
      durationMinutes: 10,
      difficulty: "MIXED",
      mode: ExamMode.REAL_EXAM,
    });

    expect(session).toBeDefined();
    expect(session.id).toBeDefined();
    expect(session.totalQuestions).toBeGreaterThanOrEqual(1);
    expect(session.status).toBe("IN_PROGRESS");
    expect(new Date(session.serverDeadline).getTime()).toBeGreaterThan(Date.now());

    testSessionId = session.id;
  });

  it("should accurately autosave student answer to the database", async () => {
    const sessionQuestions = await prisma.examSessionQuestion.findMany({
      where: { sessionId: testSessionId },
    });
    expect(sessionQuestions.length).toBeGreaterThan(0);

    const firstQ = sessionQuestions[0];
    const saved = await ExamService.saveAnswer(
      testSessionId,
      testStudentId,
      firstQ.questionId,
      "A",
      15
    );

    expect(saved.selectedOption).toBe("A");
    expect(saved.timeSpentSec).toBe(15);
  });

  it("should evaluate exam submission, enforce negative marking, and save wrong answers", async () => {
    const sessionWithQuestions = await prisma.examSession.findUnique({
      where: { id: testSessionId },
      include: {
        sessionQuestions: {
          include: {
            question: { include: { answer: true } },
          },
        },
      },
    });

    if (!sessionWithQuestions || sessionWithQuestions.sessionQuestions.length === 0) {
      throw new Error("No questions in test session");
    }

    const sqList = sessionWithQuestions.sessionQuestions;
    const q1 = sqList[0].question;
    const correctKey = q1.answer?.correctKey || "A";

    // Prepare answers: Q1 correct, and if Q2 exists mark as wrong
    const testAnswers = [
      { questionId: q1.id, selectedOption: correctKey, timeSpentSec: 10 },
    ];

    let wrongQId: string | null = null;
    if (sqList.length > 1) {
      const q2 = sqList[1].question;
      const wrongKey = q2.answer?.correctKey === "A" ? "B" : "A";
      testAnswers.push({ questionId: q2.id, selectedOption: wrongKey, timeSpentSec: 20 });
      wrongQId = q2.id;
    }

    const evaluation = await ExamService.submitAndEvaluateExam({
      sessionId: testSessionId,
      studentId: testStudentId,
      answers: testAnswers,
    });

    expect(evaluation.result).toBeDefined();
    expect(evaluation.result.correctCount).toBe(1);

    if (wrongQId) {
      expect(evaluation.result.incorrectCount).toBe(1);
      // Correct: 1 * 1.0 = 1.0, Incorrect: 1 * 0.25 = 0.25 -> Total Score = 0.75
      expect(evaluation.result.totalScore).toBeCloseTo(0.75, 2);

      // Verify incorrect question was stored in student's WrongQuestion notebook
      const wrongEntry = await prisma.wrongQuestion.findUnique({
        where: {
          studentId_questionId: {
            studentId: testStudentId,
            questionId: wrongQId,
          },
        },
      });
      expect(wrongEntry).not.toBeNull();
      expect(wrongEntry?.mistakeCount).toBeGreaterThanOrEqual(1);
    }
  });
});
