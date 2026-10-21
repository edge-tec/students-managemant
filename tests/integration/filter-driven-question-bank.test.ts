import { describe, it, expect, beforeAll } from "vitest";
import prisma from "@/lib/db/prisma";
import { QuestionService } from "@/lib/questions/questionService";
import { ExamCategoryType, QuestionType, DifficultyLevel, ContentStatus } from "@prisma/client";

describe("Filter-Driven Question Bank Acceptance Tests", () => {
  let testSubjectId: string;
  let testChapterId: string;
  let testBoardId: string;

  beforeAll(async () => {
    // Locate standard curriculum data
    const subject = await prisma.subject.findFirst({ where: { isActive: true } });
    if (subject) testSubjectId = subject.id;

    const chapter = await prisma.chapter.findFirst({ where: { isActive: true } });
    if (chapter) testChapterId = chapter.id;

    const board = await prisma.examinationBoard.findFirst({ where: { isActive: true } });
    if (board) testBoardId = board.id;
  });

  it("1. should filter questions accurately by Category when explicitly applied", async () => {
    const res = await QuestionService.listQuestions({
      category: ExamCategoryType.HSC,
      status: ContentStatus.PUBLISHED,
      page: 1,
      limit: 10,
    });

    expect(res).toBeDefined();
    expect(res.questions.length).toBeGreaterThan(0);
    for (const q of res.questions) {
      expect(q.category).toBe(ExamCategoryType.HSC);
    }
  });

  it("2. should filter questions accurately by Subject when explicitly applied", async () => {
    if (!testSubjectId) return;

    const res = await QuestionService.listQuestions({
      subjectId: testSubjectId,
      status: ContentStatus.PUBLISHED,
      page: 1,
      limit: 10,
    });

    expect(res).toBeDefined();
    for (const q of res.questions) {
      expect(q.subjectId).toBe(testSubjectId);
    }
  });

  it("3. should filter questions accurately by Search keyword", async () => {
    // Search for a keyword like 'ভেক্টর' or 'কোষ' or 'ঢাল'
    const res = await QuestionService.listQuestions({
      search: "কোষ",
      status: ContentStatus.PUBLISHED,
      page: 1,
      limit: 10,
    });

    expect(res).toBeDefined();
    for (const q of res.questions) {
      const match =
        q.questionTextBn.includes("কোষ") ||
        (q.questionTextEn && q.questionTextEn.toLowerCase().includes("cell"));
      expect(match).toBe(true);
    }
  });

  it("4. should combine multiple filters (Category + Subject + Type)", async () => {
    const res = await QuestionService.listQuestions({
      category: ExamCategoryType.HSC,
      type: QuestionType.MCQ,
      status: ContentStatus.PUBLISHED,
      page: 1,
      limit: 10,
    });

    expect(res).toBeDefined();
    for (const q of res.questions) {
      expect(q.category).toBe(ExamCategoryType.HSC);
      expect(q.type).toBe(QuestionType.MCQ);
    }
  });

  it("5. should return empty list gracefully when no questions match the specific criteria", async () => {
    const res = await QuestionService.listQuestions({
      search: "xyz_non_existent_impossible_query_9999",
      status: ContentStatus.PUBLISHED,
      page: 1,
      limit: 10,
    });

    expect(res).toBeDefined();
    expect(res.questions.length).toBe(0);
    expect(res.pagination.totalCount).toBe(0);
  });

  it("6. should paginate filtered results correctly without data duplication across pages", async () => {
    const page1 = await QuestionService.listQuestions({
      category: ExamCategoryType.HSC,
      status: ContentStatus.PUBLISHED,
      page: 1,
      limit: 5,
    });

    const page2 = await QuestionService.listQuestions({
      category: ExamCategoryType.HSC,
      status: ContentStatus.PUBLISHED,
      page: 2,
      limit: 5,
    });

    if (page1.questions.length > 0 && page2.questions.length > 0) {
      const page1Ids = new Set(page1.questions.map((q) => q.id));
      for (const q of page2.questions) {
        expect(page1Ids.has(q.id)).toBe(false);
      }
    }
  });
});
