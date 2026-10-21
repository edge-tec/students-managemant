import { describe, it, expect, beforeAll, afterAll } from "vitest";
import prisma from "@/lib/db/prisma";
import { QuestionImportEngine, QuestionImportRow } from "@/lib/imports/importEngine";

describe("Bulk Question Import Engine Tests", () => {
  let adminUserId: string;

  async function cleanupTestQuestions() {
    const testQs = await prisma.question.findMany({
      where: { questionTextBn: { contains: "টেস্ট ইম্পোর্ট প্রশ্ন" } },
      select: { id: true },
    });
    const ids = testQs.map((q) => q.id);
    if (ids.length > 0) {
      await prisma.studentAnswer.deleteMany({ where: { questionId: { in: ids } } });
      await prisma.examSessionQuestion.deleteMany({ where: { questionId: { in: ids } } });
      await prisma.examQuestion.deleteMany({ where: { questionId: { in: ids } } });
      await prisma.questionAnswer.deleteMany({ where: { questionId: { in: ids } } });
      await prisma.questionOption.deleteMany({ where: { questionId: { in: ids } } });
      await prisma.questionRevision.deleteMany({ where: { questionId: { in: ids } } });
      await prisma.contentReview.deleteMany({ where: { questionId: { in: ids } } });
      await prisma.question.deleteMany({ where: { id: { in: ids } } });
    }
  }

  beforeAll(async () => {
    await cleanupTestQuestions();
    const admin = await prisma.user.findFirst({
      where: { email: "admin@edubd.ac" },
    });
    if (!admin) throw new Error("Seed admin not found");
    adminUserId = admin.id;
  });

  afterAll(async () => {
    await cleanupTestQuestions();
  });

  it("should generate a valid CSV template containing standard Bengali question headers", () => {
    const template = QuestionImportEngine.getCsvTemplate();
    expect(template).toContain("questionTextBn");
    expect(template).toContain("correctKey");
    expect(template).toContain("explanationBn");
    expect(template).toContain("HSC");
  });

  it("should detect invalid rows and report row-level errors", () => {
    const invalidRows: QuestionImportRow[] = [
      {
        category: "INVALID_CAT",
        subjectCode: "PHY_1",
        chapterNumber: 2,
        questionTextBn: "টেস্ট প্রশ্ন",
        optionA: "ক",
        optionB: "খ",
        optionC: "গ",
        optionD: "ঘ",
        correctKey: "Z", // Invalid key
        explanationBn: "", // Missing explanation
      },
    ];

    const validation = QuestionImportEngine.validateRows(invalidRows);
    expect(validation.errors.length).toBeGreaterThan(0);
    expect(validation.validRows.length).toBe(0);
  });

  it("should validate and batch insert valid Bengali Unicode questions without duplicates", async () => {
    const validRows: QuestionImportRow[] = [
      {
        category: "HSC",
        subjectCode: "PHY_1",
        chapterNumber: 2,
        questionTextBn: "টেস্ট ইম্পোর্ট প্রশ্ন: ভেক্টর গুণন সম্পর্কিত বিশেষ প্রশ্ন?",
        optionA: "অপশন ১",
        optionB: "অপশন ২",
        optionC: "অপশন ৩",
        optionD: "অপশন ৪",
        correctKey: "B",
        explanationBn: "টেস্ট ব্যাখ্যা: অপশন ২ সঠিক কারণ সূত্র মিলেছে।",
        difficulty: "MEDIUM",
        marks: 1.0,
        negativeMarks: 0.25,
      },
    ];

    const validation = QuestionImportEngine.validateRows(validRows);
    expect(validation.validRows.length).toBe(1);
    expect(validation.errors.length).toBe(0);

    const testJob = await prisma.importJob.create({
      data: {
        fileName: "test_suite_import.csv",
        uploadedById: adminUserId,
        totalRows: 1,
      },
    });

    const result = await QuestionImportEngine.executeImport(
      testJob.id,
      validation.validRows,
      adminUserId
    );

    expect(result.successfulCount).toBe(1);

    // Verify it exists in database
    const dbQuestion = await prisma.question.findFirst({
      where: { questionTextBn: { contains: "টেস্ট ইম্পোর্ট প্রশ্ন" } },
      include: { answer: true, options: true },
    });
    expect(dbQuestion).toBeDefined();
    expect(dbQuestion?.options.length).toBe(4);
    expect(dbQuestion?.answer?.correctKey).toBe("B");

    // Re-importing same row should trigger duplicate detection and not create a duplicate
    const secondResult = await QuestionImportEngine.executeImport(
      testJob.id,
      validation.validRows,
      adminUserId
    );
    expect(secondResult.successfulCount).toBe(0);
  });
});
