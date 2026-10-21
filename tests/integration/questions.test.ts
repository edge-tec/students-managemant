import { describe, it, expect, beforeAll, afterAll } from "vitest";
import prisma from "@/lib/db/prisma";
import { QuestionService } from "@/lib/questions/questionService";
import {
  ExamCategoryType,
  QuestionType,
  DifficultyLevel,
  ContentStatus,
  ReportReason,
  ReportStatus,
} from "@prisma/client";

describe("Question Bank & Curriculum Integration Tests", () => {
  let adminUserId: string;
  let reviewerUserId: string;
  let studentUserId: string;
  let testSubjectId: string;
  let testChapterId: string;
  let testBoardId: string;

  const testPrefix = "টেস্ট_কিউব্যাংক_";

  beforeAll(async () => {
    // 1. Get seed admin, reviewer, and student
    const admin = await prisma.user.findFirst({ where: { email: "admin@edubd.ac" } });
    const student = await prisma.user.findFirst({ where: { email: "student@edubd.ac" } });
    if (!admin || !student) throw new Error("Seed users missing");
    adminUserId = admin.id;
    studentUserId = student.id;

    let reviewer = await prisma.user.findFirst({ where: { email: "reviewer@edubd.ac" } });
    if (!reviewer) {
      reviewer = await prisma.user.create({
        data: {
          email: "reviewer@edubd.ac",
          fullName: "Academic Quality Reviewer",
          passwordHash: "seed-hash",
          isActive: true,
        },
      });
    }
    reviewerUserId = reviewer.id;

    // 2. Find or create a test subject and chapter
    let subject = await prisma.subject.findFirst({ where: { code: "PHY_1" } });
    if (!subject) {
      subject = await prisma.subject.create({
        data: {
          code: "PHY_1",
          nameBn: "পদার্থবিজ্ঞান ১ম পত্র",
          nameEn: "Physics 1st Paper",
          category: ExamCategoryType.HSC,
        },
      });
    }
    testSubjectId = subject.id;

    let chapter = await prisma.chapter.findFirst({ where: { subjectId: subject.id } });
    if (!chapter) {
      chapter = await prisma.chapter.create({
        data: {
          subjectId: subject.id,
          chapterNum: 2,
          nameBn: "ভেক্টর",
          nameEn: "Vector",
        },
      });
    }
    testChapterId = chapter.id;

    let board = await prisma.examinationBoard.findFirst();
    if (!board) {
      board = await prisma.examinationBoard.create({
        data: {
          code: "DHA",
          nameBn: "ঢাকা বোর্ড",
          nameEn: "Dhaka Board",
        },
      });
    }
    testBoardId = board.id;
  });

  afterAll(async () => {
    // Cleanup questions created during tests
    const testQuestions = await prisma.question.findMany({
      where: { questionTextBn: { contains: testPrefix } },
      select: { id: true },
    });
    const ids = testQuestions.map((q) => q.id);

    if (ids.length > 0) {
      await prisma.bookmark.deleteMany({ where: { questionId: { in: ids } } });
      await prisma.questionReport.deleteMany({ where: { questionId: { in: ids } } });
      await prisma.questionRevision.deleteMany({ where: { questionId: { in: ids } } });
      await prisma.contentReview.deleteMany({ where: { questionId: { in: ids } } });
      await prisma.questionOption.deleteMany({ where: { questionId: { in: ids } } });
      await prisma.questionSubpart.deleteMany({ where: { questionId: { in: ids } } });
      await prisma.questionAnswer.deleteMany({ where: { questionId: { in: ids } } });
      await prisma.questionReference.deleteMany({ where: { questionId: { in: ids } } });
      await prisma.question.deleteMany({ where: { id: { in: ids } } });
    }
  });

  it("should validate and create a valid MCQ question with options and explanation", async () => {
    const question = await QuestionService.createQuestion(
      {
        category: ExamCategoryType.HSC,
        subjectId: testSubjectId,
        chapterId: testChapterId,
        type: QuestionType.MCQ,
        difficulty: DifficultyLevel.MEDIUM,
        status: ContentStatus.PUBLISHED,
        questionTextBn: `${testPrefix} ভেক্টর রাশি কোনটি?`,
        questionTextEn: "Which one is a vector quantity?",
        marks: 1.0,
        negativeMarks: 0.25,
        options: [
          { optionKey: "A", textBn: "ভর (Mass)", isCorrect: false },
          { optionKey: "B", textBn: "সময় (Time)", isCorrect: false },
          { optionKey: "C", textBn: "বেগ (Velocity)", isCorrect: true },
          { optionKey: "D", textBn: "দ্রুতি (Speed)", isCorrect: false },
        ],
        answer: {
          correctKey: "C",
          explanationBn: "বেগ হলো নির্দিষ্ট দিকে সরণের হার, তাই এটি ভেক্টর রাশি।",
          explanationEn: "Velocity has both magnitude and direction.",
        },
        references: [
          {
            boardId: testBoardId,
            examYear: 2023,
            examSessionName: "ঢাকা বোর্ড ২০২৩",
          },
        ],
      },
      adminUserId
    );

    expect(question).toBeDefined();
    expect(question.id).toBeDefined();
    expect(question.type).toBe(QuestionType.MCQ);

    // Verify relations in DB
    const fetched = await prisma.question.findUnique({
      where: { id: question.id },
      include: { options: true, answer: true, references: true, revisions: true },
    });
    expect(fetched?.options.length).toBe(4);
    expect(fetched?.answer?.correctKey).toBe("C");
    expect(fetched?.references.length).toBe(1);
    expect(fetched?.revisions.length).toBe(1);
  });

  it("should enforce validation: MCQ must have options and correct answer", async () => {
    await expect(
      QuestionService.createQuestion(
        {
          category: ExamCategoryType.HSC,
          subjectId: testSubjectId,
          chapterId: testChapterId,
          type: QuestionType.MCQ,
          questionTextBn: `${testPrefix} ত্রুটিপূর্ণ প্রশ্ন`,
          options: [], // No options
        },
        adminUserId
      )
    ).rejects.toThrow(/MCQ questions require at least 2 options/);
  });

  it("should create a Creative Question (CQ) with 4 subparts summing to 10 marks", async () => {
    const cq = await QuestionService.createQuestion(
      {
        category: ExamCategoryType.HSC,
        subjectId: testSubjectId,
        chapterId: testChapterId,
        type: QuestionType.CQ,
        difficulty: DifficultyLevel.HARD,
        status: ContentStatus.DRAFT,
        questionTextBn: `${testPrefix} উদ্দীপকের সৃজনশীল প্রশ্ন`,
        stemBn: "একটি নদীতে স্রোতের বেগ $3\\text{ km/h}$ এবং নৌকার বেগ $5\\text{ km/h}$। একজন মাঝি সোজা অপর পাড়ে পৌঁছাতে চায়।",
        marks: 10.0,
        subparts: [
          {
            partLabel: "ক",
            questionTextBn: "নাল ভেক্টর কাকে বলে?",
            marks: 1.0,
            solutionBn: "যে ভেক্টরের মান শূন্য তাকে নাল বা শূন্য ভেক্টর বলে।",
            markingGuidance: "সঠিক সংজ্ঞার জন্য ১ নম্বর।",
          },
          {
            partLabel: "খ",
            questionTextBn: "দুটি সমমানের ভেক্টরের লব্ধি কি শূন্য হতে পারে? ব্যাখ্যা কর।",
            marks: 2.0,
            solutionBn: "হ্যাঁ, দুটি সমান মানের ভেক্টর পরস্পর ১৮০ ডিগ্রি কোণে ক্রিয়া করলে লব্ধি শূন্য হয়।",
            markingGuidance: "শর্ত ও ব্যাখ্যার জন্য ২ নম্বর।",
          },
          {
            partLabel: "গ",
            questionTextBn: "নৌকাটির লব্ধি বেগ কত হবে নির্ণয় কর।",
            marks: 3.0,
            solutionBn: "$R = \\sqrt{5^2 - 3^2} = 4\\text{ km/h}$।",
            markingGuidance: "সূত্র প্রয়োগ ও সঠিক মানের জন্য ৩ নম্বর।",
          },
          {
            partLabel: "ঘ",
            questionTextBn: "মাঝি কোন দিকে নৌকা চালালে সর্বনিম্ন সময়ে অপর পাড়ে পৌঁছাতে পারবে? গাণিতিক বিশ্লেষণ দাও।",
            marks: 4.0,
            solutionBn: "সর্বনিম্ন সময়ে পার হতে হলে নদীর প্রস্থ বরাবর ৯০ ডিগ্রি কোণে চালনা করতে হবে।",
            markingGuidance: "যুক্তি ও সমীকরণের জন্য ৪ নম্বর।",
          },
        ],
      },
      adminUserId
    );

    expect(cq).toBeDefined();
    expect(cq.type).toBe(QuestionType.CQ);
    expect(cq.marks).toBe(10.0);

    const fetchedCq = await prisma.question.findUnique({
      where: { id: cq.id },
      include: { subparts: true },
    });
    expect(fetchedCq?.subparts.length).toBe(4);
    const totalMarks = fetchedCq?.subparts.reduce((sum, sp) => sum + sp.marks, 0);
    expect(totalMarks).toBe(10.0);
  });

  it("should handle status transitions (DRAFT -> REVIEW -> APPROVED -> PUBLISHED) and log audit review history", async () => {
    // 1. Create a question
    const q = await QuestionService.createQuestion(
      {
        category: ExamCategoryType.SSC,
        subjectId: testSubjectId,
        chapterId: testChapterId,
        type: QuestionType.MCQ,
        questionTextBn: `${testPrefix} স্ট্যাটাস রিভিউ লাইফসাইকেল টেস্ট`,
        options: [
          { optionKey: "A", textBn: "ক", isCorrect: true },
          { optionKey: "B", textBn: "খ", isCorrect: false },
        ],
        answer: { correctKey: "A", explanationBn: "সঠিক ব্যাখ্যা" },
      },
      adminUserId
    );

    expect(q.status).toBe(ContentStatus.DRAFT);

    // 2. Submit for review
    const inReview = await QuestionService.updateStatus(q.id, ContentStatus.REVIEW, adminUserId, "Submitted for staff audit");
    expect(inReview.status).toBe(ContentStatus.REVIEW);

    // 3. Separation of duties: Author cannot approve their own question
    await expect(
      QuestionService.updateStatus(q.id, ContentStatus.APPROVED, adminUserId, "Author trying to approve own question")
    ).rejects.toThrow("Separation of duties");

    // 4. Authorized independent reviewer approves
    const approved = await QuestionService.updateStatus(q.id, ContentStatus.APPROVED, reviewerUserId, "Content verified");
    expect(approved.status).toBe(ContentStatus.APPROVED);

    // 5. Publish by reviewer
    const published = await QuestionService.updateStatus(q.id, ContentStatus.PUBLISHED, reviewerUserId, "Live for students");
    expect(published.status).toBe(ContentStatus.PUBLISHED);

    // Verify ContentReviews and Revisions exist in DB
    const reviews = await prisma.contentReview.findMany({ where: { questionId: q.id } });
    expect(reviews.length).toBe(3);

    const revisions = await prisma.questionRevision.findMany({ where: { questionId: q.id } });
    expect(revisions.length).toBeGreaterThanOrEqual(4); // 1 create + 3 status changes
  });

  it("should search questions effectively in Unicode Bengali and English", async () => {
    // Query with Bengali search query
    const results = await QuestionService.listQuestions({
      search: "ভেক্টর রাশি কোনটি",
      limit: 10,
    });

    expect(results.questions.length).toBeGreaterThan(0);
    expect(results.questions.some((q) => q.questionTextBn.includes("ভেক্টর রাশি"))).toBe(true);

    // English search query
    const engResults = await QuestionService.listQuestions({
      search: "vector quantity",
      limit: 10,
    });
    expect(engResults.questions.some((q) => q.questionTextEn?.includes("vector quantity"))).toBe(true);
  });

  it("should enforce premium content protection for unauthorized students", async () => {
    // 1. Create a premium question
    const premiumQ = await QuestionService.createQuestion(
      {
        category: ExamCategoryType.HSC,
        subjectId: testSubjectId,
        chapterId: testChapterId,
        type: QuestionType.MCQ,
        isPremium: true,
        status: ContentStatus.PUBLISHED,
        questionTextBn: `${testPrefix} স্পেশাল প্রিমিয়াম প্রশ্ন?`,
        options: [
          { optionKey: "A", textBn: "অপশন ১", isCorrect: true },
          { optionKey: "B", textBn: "অপশন ২", isCorrect: false },
        ],
        answer: {
          correctKey: "A",
          explanationBn: "গোপনীয় প্রিমিয়াম সমাধান যা বিনামূল্যে দেখা যাবে না।",
        },
      },
      adminUserId
    );

    // 2. Fetch as regular student (non-staff, guaranteed no active subscription)
    const unsubStudent = await prisma.user.create({
      data: {
        email: `unsub_${Date.now()}@edubd.ac`,
        passwordHash: "dummyhash",
        fullName: "Unsubscribed Test Student",
      },
    });

    try {
      const studentView = await QuestionService.getQuestionById(premiumQ.id, unsubStudent.id, false);
      expect(studentView).toBeDefined();
      expect(studentView?.isLocked).toBe(true);
      expect(studentView?.answer).toBeNull();
      // Options must mask isCorrect
      expect(studentView?.options.every((opt) => opt.isCorrect === false)).toBe(true);
    } finally {
      await prisma.user.delete({ where: { id: unsubStudent.id } });
    }

    // 3. Fetch as staff administrator
    const staffView = await QuestionService.getQuestionById(premiumQ.id, adminUserId, true);
    expect(staffView?.isLocked).toBe(false);
    expect(staffView?.answer).toBeDefined();
    expect(staffView?.answer?.correctKey).toBe("A");
  });

  it("should support bookmarking and unbookmarking by a student", async () => {
    const q = await prisma.question.findFirst({
      where: { questionTextBn: { contains: testPrefix }, status: ContentStatus.PUBLISHED },
    });
    expect(q).toBeDefined();

    // 1. Toggle bookmark ON
    const firstToggle = await QuestionService.toggleBookmark(q!.id, studentUserId);
    expect(firstToggle.bookmarked).toBe(true);

    const checkView = await QuestionService.getQuestionById(q!.id, studentUserId, false);
    expect(checkView?.isBookmarked).toBe(true);

    // 2. Toggle bookmark OFF
    const secondToggle = await QuestionService.toggleBookmark(q!.id, studentUserId);
    expect(secondToggle.bookmarked).toBe(false);

    const checkViewAfter = await QuestionService.getQuestionById(q!.id, studentUserId, false);
    expect(checkViewAfter?.isBookmarked).toBe(false);
  });

  it("should allow reporting an issue on a question", async () => {
    const q = await prisma.question.findFirst({
      where: { questionTextBn: { contains: testPrefix } },
    });
    expect(q).toBeDefined();

    const report = await QuestionService.reportQuestion(q!.id, studentUserId, {
      reason: ReportReason.WRONG_ANSWER,
      description: "অপশন ৩ সঠিক হতে পারে, অনুগ্রহ করে পুনরায় যাচাই করুন।",
    });

    expect(report).toBeDefined();
    expect(report.reason).toBe(ReportReason.WRONG_ANSWER);
    expect(report.status).toBe(ReportStatus.PENDING);

    const dbReport = await prisma.questionReport.findUnique({ where: { id: report.id } });
    expect(dbReport?.description).toContain("অপশন ৩");
  });

  it("should list question reports with status and reason filters and pagination", async () => {
    const q = await prisma.question.findFirst({
      where: { questionTextBn: { contains: testPrefix } },
    });
    expect(q).toBeDefined();

    // Create a typo report as well
    await QuestionService.reportQuestion(q!.id, studentUserId, {
      reason: ReportReason.TYPO_OR_GRAMMAR,
      description: "প্রশ্নের বানানে ভুল রয়েছে।",
    });

    // 1. List all pending reports
    const pendingList = await QuestionService.listQuestionReports({
      status: ReportStatus.PENDING,
      page: 1,
      limit: 10,
    });

    expect(pendingList.reports.length).toBeGreaterThanOrEqual(2);
    expect(pendingList.pagination.pendingCount).toBeGreaterThanOrEqual(2);
    expect(pendingList.reports.some((r) => r.reason === ReportReason.WRONG_ANSWER)).toBe(true);
    expect(pendingList.reports.some((r) => r.reason === ReportReason.TYPO_OR_GRAMMAR)).toBe(true);

    // 2. Filter by specific reason
    const typoList = await QuestionService.listQuestionReports({
      reason: ReportReason.TYPO_OR_GRAMMAR,
      page: 1,
      limit: 10,
    });

    expect(typoList.reports.every((r) => r.reason === ReportReason.TYPO_OR_GRAMMAR)).toBe(true);

    // 3. Search filter
    const searchList = await QuestionService.listQuestionReports({
      search: "বানানে ভুল",
    });
    expect(searchList.reports.length).toBeGreaterThanOrEqual(1);
    expect(searchList.reports[0].description).toContain("বানানে ভুল");
  });

  it("should allow content reviewer or admin to resolve a question report with notes and audit trail", async () => {
    const q = await prisma.question.findFirst({
      where: { questionTextBn: { contains: testPrefix } },
    });
    expect(q).toBeDefined();

    const report = await QuestionService.reportQuestion(q!.id, studentUserId, {
      reason: ReportReason.WRONG_ANSWER,
      description: "উত্তর অপশন B হওয়া উচিত।",
    });

    // Resolve the report
    const resolved = await QuestionService.resolveQuestionReport(
      report.id,
      ReportStatus.RESOLVED,
      "সংশোধন করা হয়েছে: অপশন B কে সঠিক উত্তর হিসেবে চিহ্নিত করা হলো।",
      reviewerUserId,
      "127.0.0.1"
    );

    expect(resolved.status).toBe(ReportStatus.RESOLVED);
    expect(resolved.adminNotes).toContain("সংশোধন করা হয়েছে");

    // Verify DB update
    const dbReport = await prisma.questionReport.findUnique({ where: { id: report.id } });
    expect(dbReport?.status).toBe(ReportStatus.RESOLVED);
    expect(dbReport?.adminNotes).toContain("অপশন B কে সঠিক উত্তর");

    // Verify audit log
    const auditLog = await prisma.auditLog.findFirst({
      where: {
        resource: "QuestionReport",
        resourceId: report.id,
        action: "QUESTION_REPORT_RESOLVED",
      },
    });
    expect(auditLog).toBeDefined();
    expect(auditLog?.userId).toBe(reviewerUserId);
  });

  it("should allow dismissing a question report with notes", async () => {
    const q = await prisma.question.findFirst({
      where: { questionTextBn: { contains: testPrefix } },
    });
    expect(q).toBeDefined();

    const report = await QuestionService.reportQuestion(q!.id, studentUserId, {
      reason: ReportReason.OUT_OF_SYLLABUS,
      description: "এই অধ্যায়টি সিলেবাসে নেই।",
    });

    const dismissed = await QuestionService.resolveQuestionReport(
      report.id,
      ReportStatus.DISMISSED,
      "যাচাই করা হয়েছে: এটি ২০২৪ সালের বোর্ড সিলেবাসে অন্তর্ভুক্ত।",
      adminUserId
    );

    expect(dismissed.status).toBe(ReportStatus.DISMISSED);
    expect(dismissed.adminNotes).toContain("বোর্ড সিলেবাসে অন্তর্ভুক্ত");

    const dbReport = await prisma.questionReport.findUnique({ where: { id: report.id } });
    expect(dbReport?.status).toBe(ReportStatus.DISMISSED);
  });
});

