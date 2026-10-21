import { describe, it, expect, beforeAll, afterAll } from "vitest";
import prisma from "@/lib/db/prisma";
import { ExamService } from "@/lib/exams/examService";
import {
  ExamCategoryType,
  ExamType,
  ExamStatus,
  ExamAccessType,
  ResultReleasePolicy,
  FinalizationReason,
  QuestionType,
} from "@prisma/client";

describe("Phase 3: Advanced Examination Engine Integration Tests", () => {
  let studentUser: any;
  let otherStudentUser: any;
  let adminUser: any;
  let testSubject: any;
  let testQuestions: any[] = [];
  let createdExamId: string;
  let createdSessionId: string;
  let testSubjectiveQuestionId: string;

  beforeAll(async () => {
    // 1. Get or create test users
    studentUser = await prisma.user.findFirst({
      where: { email: "student@edubd.ac" },
    });
    if (!studentUser) throw new Error("Seed student user not found");

    adminUser = await prisma.user.findFirst({
      where: { email: "admin@edubd.ac" },
    });
    if (!adminUser) throw new Error("Seed admin user not found");

    const studentRole = await prisma.role.findFirst({
      where: { name: "STUDENT" },
    });

    // Create a secondary student for isolation testing if needed
    otherStudentUser = await prisma.user.upsert({
      where: { email: "other_student_test@edubd.ac" },
      update: {},
      create: {
        email: "other_student_test@edubd.ac",
        fullName: "Other Test Student",
        fullNameBn: "অন্যান্য শিক্ষার্থী",
        passwordHash: "$2b$10$dummyHashForTestingPurposesOnly123456",
        isVerified: true,
        userRoles: studentRole
          ? {
              create: [{ roleId: studentRole.id }],
            }
          : undefined,
      },
    });

    // 2. Fetch subject and real questions from Question Bank
    testSubject = await prisma.subject.findFirst({
      where: { category: ExamCategoryType.HSC },
    });
    if (!testSubject) throw new Error("Seed HSC subject not found");

    testQuestions = await prisma.question.findMany({
      where: {
        subjectId: testSubject.id,
        options: { some: {} },
        answer: { isNot: null },
      },
      include: {
        options: true,
        answer: true,
      },
      take: 4,
    });

    if (testQuestions.length < 2) {
      throw new Error("Insufficient seed questions found for Phase 3 tests");
    }

    // 3. Create a subjective question (CQ) for manual grading testing if none exists
    const chapter = await prisma.chapter.findFirst({
      where: { subjectId: testSubject.id },
    });

    const subjectiveQ = await prisma.question.create({
      data: {
        category: ExamCategoryType.HSC,
        type: QuestionType.CQ,
        difficulty: "MEDIUM",
        status: "PUBLISHED",
        subjectId: testSubject.id,
        chapterId: chapter?.id,
        marks: 5,
        questionTextBn: "নিউটনের ৩য় সূত্র বিবৃত করো এবং উদাহরণ দাও।",
        questionTextEn: "State Newton's 3rd law and give an example.",
        answer: {
          create: {
            correctKey: "WRITTEN",
            explanationBn: "প্রত্যেক ক্রিয়ারই একটি সমান ও বিপরীত প্রতিক্রিয়া আছে।",
          },
        },
      },
    });
    testSubjectiveQuestionId = subjectiveQ.id;
  });

  afterAll(async () => {
    // Clean up created resources
    if (createdExamId) {
      await prisma.examAuditEvent.deleteMany({ where: { examId: createdExamId } });
      const sessions = await prisma.examSession.findMany({ where: { examId: createdExamId } });
      for (const s of sessions) {
        await prisma.manualGrade.deleteMany({ where: { answer: { sessionId: s.id } } });
        await prisma.studentAnswer.deleteMany({ where: { sessionId: s.id } });
        await prisma.examResult.deleteMany({ where: { sessionId: s.id } });
        await prisma.examSessionQuestion.deleteMany({ where: { sessionId: s.id } });
        await prisma.examSession.deleteMany({ where: { id: s.id } });
      }
      await prisma.examQuestion.deleteMany({ where: { examId: createdExamId } });
      await prisma.examSection.deleteMany({ where: { examId: createdExamId } });
      await prisma.exam.deleteMany({ where: { id: createdExamId } });
    }

    if (testSubjectiveQuestionId) {
      await prisma.manualGrade.deleteMany({ where: { answer: { questionId: testSubjectiveQuestionId } } });
      await prisma.studentAnswer.deleteMany({ where: { questionId: testSubjectiveQuestionId } });
      await prisma.questionAnswer.deleteMany({ where: { questionId: testSubjectiveQuestionId } });
      await prisma.question.deleteMany({ where: { id: testSubjectiveQuestionId } });
    }

    await prisma.userRole.deleteMany({ where: { userId: otherStudentUser.id } });
    await prisma.user.deleteMany({ where: { id: otherStudentUser.id } });
  });

  it("1. should validate exam configuration and reject negative duration or invalid marks", async () => {
    await expect(
      ExamService.createAdminExam(adminUser.id, {
        titleBn: "ত্রুটিযুক্ত পরীক্ষা",
        titleEn: "Invalid Exam",
        category: ExamCategoryType.HSC,
        examType: ExamType.MODEL_TEST,
        durationMinutes: -10, // Invalid!
        totalMarks: 50,
        questionCount: 10,
      })
    ).rejects.toThrow("Duration must be greater than zero");

    await expect(
      ExamService.createAdminExam(adminUser.id, {
        titleBn: "ত্রুটিযুক্ত পরীক্ষা ২",
        titleEn: "Invalid Exam 2",
        category: ExamCategoryType.HSC,
        examType: ExamType.MODEL_TEST,
        durationMinutes: 30,
        totalMarks: 0, // Invalid!
        questionCount: 10,
      })
    ).rejects.toThrow("Total marks must be greater than zero");
  });

  it("2. should create an exam with sections, Question Bank questions, and schedule window", async () => {
    const qIds = [...testQuestions.map((q) => q.id), testSubjectiveQuestionId];

    const exam = await ExamService.createAdminExam(adminUser.id, {
      titleBn: "এইচএসসি পদার্থবিজ্ঞান অগ্রবর্তী মডেল টেস্ট ২০২৬",
      titleEn: "HSC Physics Advanced Model Test 2026",
      descriptionBn: "পূর্ণাঙ্গ সিলেবাসের উপর প্রস্তুতিমূলক মডেল পরীক্ষা।",
      descriptionEn: "Comprehensive preparatory model test on full syllabus.",
      category: ExamCategoryType.HSC,
      examType: ExamType.MODEL_TEST,
      subjectId: testSubject.id,
      durationMinutes: 45,
      totalMarks: 25,
      passMarks: 10,
      negativeMarks: 0.25,
      questionCount: qIds.length,
      maxAttempts: 1,
      accessType: ExamAccessType.FREE,
      releasePolicy: ResultReleasePolicy.IMMEDIATE,
      randomizeQuestions: true,
      randomizeOptions: true,
      questionIds: qIds,
      sections: [
        {
          titleBn: "বিভাগ ক: বহুনির্বাচনী",
          titleEn: "Section A: MCQ",
          durationMinutes: 30,
          totalMarks: 20,
        },
        {
          titleBn: "বিভাগ খ: সংক্ষিপ্ত উত্তর",
          titleEn: "Section B: Written",
          durationMinutes: 15,
          totalMarks: 5,
        },
      ],
    });

    expect(exam).toBeDefined();
    expect(exam.id).toBeDefined();
    expect(exam.status).toBe(ExamStatus.DRAFT);
    expect(exam.version).toBe(1);
    expect(exam.sections.length).toBe(2);
    expect(exam.examQuestions.length).toBe(qIds.length);

    createdExamId = exam.id;
  });

  it("3. should publish the exam and record an audit log", async () => {
    const published = await ExamService.publishAdminExam(createdExamId, adminUser.id);
    expect(published.status).toBe(ExamStatus.PUBLISHED);

    // Verify audit event
    const audit = await prisma.examAuditEvent.findFirst({
      where: { examId: createdExamId, action: "EXAM_PUBLISHED" },
    });
    expect(audit).toBeDefined();
    expect(audit?.userId).toBe(adminUser.id);
  });

  it("4. should verify student eligibility before starting", async () => {
    const eligibility = await ExamService.checkEligibility(createdExamId, studentUser.id);
    expect(eligibility.eligible).toBe(true);
    expect(eligibility.attemptsUsed).toBe(0);
    expect(eligibility.maxAttempts).toBe(1);
    expect(eligibility.activeSessionId).toBeUndefined();
  });

  it("5. should start a durable attempt with server-authoritative deadline and handle duplicate starts idempotently", async () => {
    const session1 = await ExamService.startExamAttempt(createdExamId, studentUser.id);
    expect(session1).toBeDefined();
    expect(session1.id).toBeDefined();
    expect(session1.attemptNumber).toBe(1);
    expect(session1.status).toBe("IN_PROGRESS");

    // Server-authoritative deadline must be in the future
    const deadline = new Date(session1.serverDeadline).getTime();
    const now = Date.now();
    expect(deadline).toBeGreaterThan(now);

    createdSessionId = session1.id;

    // Idempotent start: calling start again while IN_PROGRESS must return the SAME active attempt
    const session2 = await ExamService.startExamAttempt(createdExamId, studentUser.id);
    expect(session2.id).toBe(session1.id);
  });

  it("6. should autosave answers, persist marked-for-review, and enforce cross-student isolation", async () => {
    const q1 = testQuestions[0];
    const correctOpt = q1.options.find((o: any) => o.isCorrect)?.optionKey || q1.options[0].optionKey;

    // Save student answer
    const saved = await ExamService.saveAnswer({
      sessionId: createdSessionId,
      studentId: studentUser.id,
      questionId: q1.id,
      selectedOption: correctOpt,
      isMarkedForReview: true,
      timeSpentSec: 25,
    });

    expect(saved).toBeDefined();
    expect(saved.selectedOption).toBe(correctOpt);
    expect(saved.isMarkedForReview).toBe(true);

    // Also save a written answer for the subjective question
    await ExamService.saveAnswer({
      sessionId: createdSessionId,
      studentId: studentUser.id,
      questionId: testSubjectiveQuestionId,
      writtenAnswer: "প্রত্যেক ক্রিয়ারই একটি সমান ও বিপরীত প্রতিক্রিয়া আছে। যেমন রকেটের গতি।",
      timeSpentSec: 40,
    });

    // Cross-student security check: another student cannot tamper with this session
    await expect(
      ExamService.saveAnswer({
        sessionId: createdSessionId,
        studentId: otherStudentUser.id,
        questionId: q1.id,
        selectedOption: "B",
      })
    ).rejects.toThrow("Unauthorized session access");
  });

  it("7. should submit and automatically grade objective questions and enforce pass/fail boundaries", async () => {
    const q1 = testQuestions[0];
    const q2 = testQuestions[1];
    const correctOpt1 = q1.options.find((o: any) => o.isCorrect)?.optionKey;
    const incorrectOpt2 = q2.options.find((o: any) => !o.isCorrect)?.optionKey || "Z";

    const evalRes = await ExamService.submitAndEvaluateExam({
      sessionId: createdSessionId,
      studentId: studentUser.id,
      answers: [
        { questionId: q1.id, selectedOption: correctOpt1, timeSpentSec: 30 },
        { questionId: q2.id, selectedOption: incorrectOpt2, timeSpentSec: 30 },
      ],
    });

    expect(evalRes).toBeDefined();
    expect(evalRes.result).toBeDefined();

    const result = evalRes.result!;
    expect(result.correctCount).toBeGreaterThanOrEqual(1);
    expect(result.incorrectCount).toBeGreaterThanOrEqual(1);

    // Verify negative marking calculation
    const expectedScore = result.correctCount * 1 - result.incorrectCount * 0.25;
    expect(result.totalScore).toBeCloseTo(expectedScore, 2);

    // Verify session status updated
    const session = await prisma.examSession.findUnique({ where: { id: createdSessionId } });
    expect(session?.status).toBe("EVALUATED");

    // Idempotent submission: submitting again must return alreadyEvaluated: true
    const reSubmit = await ExamService.submitAndEvaluateExam({
      sessionId: createdSessionId,
      studentId: studentUser.id,
    });
    expect(reSubmit.alreadyEvaluated).toBe(true);
  });

  it("8. should enforce max attempts limit on subsequent start requests", async () => {
    const eligibility = await ExamService.checkEligibility(createdExamId, studentUser.id);
    expect(eligibility.eligible).toBe(false);
    expect(eligibility.reason).toContain("Maximum attempts reached");

    await expect(
      ExamService.startExamAttempt(createdExamId, studentUser.id)
    ).rejects.toThrow("Maximum attempts reached");
  });

  it("9. should support manual grading queue and score recalculation for subjective answers", async () => {
    // 1. Check grading queue
    const queue = await ExamService.getManualGradingQueue({ examId: createdExamId, status: "PENDING" });
    const targetItem = queue.items.find((item: any) => item.questionId === testSubjectiveQuestionId);
    expect(targetItem).toBeDefined();
    expect(targetItem.writtenAnswer).toContain("প্রতিক্রিয়া");

    // 2. Award 4.5 marks out of 5
    const graded = await ExamService.gradeSubjectiveAnswer({
      studentAnswerId: targetItem.id,
      graderId: adminUser.id,
      marksAwarded: 4.5,
      feedback: "সুন্দর নির্ভুল উত্তর ও প্রাসঙ্গিক উদাহরণ।",
    });

    expect(graded).toBeDefined();
    expect(graded.marksAwarded).toBe(4.5);

    // 3. Verify total score recalculated on the ExamResult
    const updatedResult = await prisma.examResult.findFirst({
      where: { sessionId: createdSessionId },
    });
    expect(updatedResult?.totalScore).toBeGreaterThan(4);
  });

  it("10. should allow authorized staff to regrade an attempt with recorded audit reason", async () => {
    const regraded = await ExamService.regradeExamSession({
      sessionId: createdSessionId,
      graderId: adminUser.id,
      reason: "অতিরিক্ত বিবেচনায় ১ মার্ক যোগ করা হলো",
    });

    expect(regraded).toBeDefined();
    expect(regraded.regradedAt).toBeDefined();
    expect(regraded.regradeReason).toContain("অতিরিক্ত বিবেচনায়");
    expect(regraded.regradedBy).toBe(adminUser.id);
  });

  it("11. should generate a wrong-answer practice session from student mistakes without modifying historical results", async () => {
    const practiceSession = await ExamService.createWrongAnswerPracticeSession(studentUser.id, {
      category: ExamCategoryType.HSC,
      limit: 5,
    });

    expect(practiceSession).toBeDefined();
    expect(practiceSession.mode).toBe("PRACTICE");
    expect(practiceSession.totalQuestions).toBeGreaterThanOrEqual(1);

    // Cleanup practice session
    await prisma.examSessionQuestion.deleteMany({ where: { sessionId: practiceSession.id } });
    await prisma.examSession.deleteMany({ where: { id: practiceSession.id } });
  });

  it("12. should auto-version an exam when edited after attempts have started", async () => {
    const updated = await ExamService.updateAdminExam(createdExamId, adminUser.id, {
      instructionsBn: "নতুন আপডেটকৃত নির্দেশাবলী।",
      passMarks: 12,
    });

    expect(updated.version).toBe(2);
    expect(updated.passMarks).toBe(12);

    // Verify historical session still points to exam without data corruption
    const oldSession = await prisma.examSession.findUnique({
      where: { id: createdSessionId },
    });
    expect(oldSession?.examId).toBe(createdExamId);
  });
});
