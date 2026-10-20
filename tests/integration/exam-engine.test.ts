import { describe, it, expect, beforeAll, afterAll } from "vitest";
import prisma from "@/lib/db/prisma";
import { ExamService } from "@/lib/exams/examService";
import { ExamCategoryType, ExamMode } from "@prisma/client";

describe("Examination Engine Integration Tests", () => {
  let testStudentId: string;
  let testSubjectId: string;
  let testSessionId: string;
  let testTemplateSessionId: string;
  let templateId: string;

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

    // Find seeded exam template
    const template = await prisma.examTemplate.findFirst({
      where: { category: ExamCategoryType.HSC },
    });
    if (!template) throw new Error("Seed exam template not found");
    templateId = template.id;
  });

  afterAll(async () => {
    // Cleanup created test sessions
    const sessionIds = [testSessionId, testTemplateSessionId].filter(Boolean);
    for (const sid of sessionIds) {
      await prisma.studentAnswer.deleteMany({ where: { sessionId: sid } });
      await prisma.examResult.deleteMany({ where: { sessionId: sid } });
      await prisma.examSessionQuestion.deleteMany({ where: { sessionId: sid } });
      await prisma.examSession.deleteMany({ where: { id: sid } });
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

    // Cohort ranking and percentile
    expect(evaluation.result.rankInCohort).toBeGreaterThanOrEqual(1);
    expect(evaluation.result.cohortSize).toBeGreaterThanOrEqual(1);
    expect(evaluation.result.percentile).toBeDefined();
  });

  it("should list available exam templates with attempt status", async () => {
    const templates = await ExamService.listExamTemplates({
      category: ExamCategoryType.HSC,
      studentId: testStudentId,
    });

    expect(templates.length).toBeGreaterThan(0);
    const target = templates.find((t) => t.id === templateId);
    expect(target).toBeDefined();
    expect(target?.titleBn).toBeDefined();
    expect(target?.questionCount).toBeGreaterThan(0);
  });

  it("should create an exam session from an ExamTemplate", async () => {
    const session = await ExamService.createExamFromTemplate(templateId, testStudentId);

    expect(session).toBeDefined();
    expect(session.templateId).toBe(templateId);
    expect(session.status).toBe("IN_PROGRESS");
    expect(session.totalQuestions).toBeGreaterThan(0);

    testTemplateSessionId = session.id;
  });

  it("should evaluate a template exam and update leaderboard and student history", async () => {
    const sessionWithQuestions = await prisma.examSession.findUnique({
      where: { id: testTemplateSessionId },
      include: {
        sessionQuestions: {
          include: {
            question: { include: { answer: true } },
          },
        },
      },
    });

    expect(sessionWithQuestions).not.toBeNull();
    const sq = sessionWithQuestions!.sessionQuestions[0];
    const correctKey = sq.question.answer?.correctKey || "A";

    const evaluation = await ExamService.submitAndEvaluateExam({
      sessionId: testTemplateSessionId,
      studentId: testStudentId,
      answers: [{ questionId: sq.question.id, selectedOption: correctKey, timeSpentSec: 30 }],
    });

    expect(evaluation.result.totalScore).toBeGreaterThan(0);
    expect(evaluation.result.rankInCohort).toBeGreaterThanOrEqual(1);

    // Verify leaderboard returns this result
    const leaderboard = await ExamService.getExamLeaderboard({
      templateId,
      limit: 5,
    });
    expect(leaderboard.length).toBeGreaterThanOrEqual(1);
    expect(leaderboard[0].score).toBeGreaterThan(0);
    expect(leaderboard[0].studentName).toBeDefined();

    // Verify student history returns completed sessions
    const history = await ExamService.getStudentExamHistory(testStudentId, 5);
    expect(history.length).toBeGreaterThanOrEqual(1);
    const found = history.find((h) => h.id === testTemplateSessionId);
    expect(found).toBeDefined();
    expect(found?.result?.totalScore).toBeDefined();
  });

  it("should create an adaptive custom exam targeting unmastered wrong questions", async () => {
    const adaptiveSession = await ExamService.createCustomExam({
      studentId: testStudentId,
      category: ExamCategoryType.HSC,
      subjectId: testSubjectId,
      chapterIds: [],
      questionCount: 2,
      durationMinutes: 10,
      difficulty: "MIXED",
      mode: ExamMode.REAL_EXAM,
      adaptive: true,
    });

    expect(adaptiveSession).toBeDefined();
    expect(adaptiveSession.totalQuestions).toBeGreaterThanOrEqual(1);

    // Clean up adaptive session
    await prisma.examSessionQuestion.deleteMany({ where: { sessionId: adaptiveSession.id } });
    await prisma.examSession.deleteMany({ where: { id: adaptiveSession.id } });
  });
});
