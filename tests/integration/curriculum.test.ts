import { describe, it, expect, afterAll } from "vitest";
import prisma from "@/lib/db/prisma";
import { CurriculumService } from "@/lib/curriculum/curriculumService";
import { ExamCategoryType } from "@prisma/client";

describe("Curriculum Management Integration Tests", () => {
  const testClassCode = "TEST_CLASS_10";
  const testSubjectCode = "TEST_CHEM_1";
  const testBoardCode = "TEST_BOG";

  afterAll(async () => {
    // Cleanup any created test entities safely
    await prisma.questionReference.deleteMany({
      where: { board: { code: testBoardCode } },
    });
    await prisma.question.deleteMany({
      where: { subject: { code: testSubjectCode } },
    });
    await prisma.topic.deleteMany({
      where: { chapter: { subject: { code: testSubjectCode } } },
    });
    await prisma.chapter.deleteMany({
      where: { subject: { code: testSubjectCode } },
    });
    await prisma.paper.deleteMany({
      where: { subject: { code: testSubjectCode } },
    });
    await prisma.subject.deleteMany({
      where: { code: testSubjectCode },
    });
    await prisma.academicClass.deleteMany({
      where: { code: testClassCode },
    });
    await prisma.examinationBoard.deleteMany({
      where: { code: testBoardCode },
    });
  });

  it("should create and retrieve an academic class", async () => {
    const cls = await CurriculumService.createClass({
      code: testClassCode,
      nameBn: "দশম শ্রেণি (টেস্ট)",
      nameEn: "Class 10 (Test)",
      orderIndex: 10,
    });

    expect(cls).toBeDefined();
    expect(cls.code).toBe(testClassCode);

    const allClasses = await CurriculumService.listClasses(false);
    const found = allClasses.find((c) => c.code === testClassCode);
    expect(found).toBeDefined();
    expect(found?.nameBn).toBe("দশম শ্রেণি (টেস্ট)");
  });

  it("should create a subject with HSC papers and chapters", async () => {
    const cls = await prisma.academicClass.findUnique({ where: { code: testClassCode } });
    expect(cls).toBeDefined();

    // 1. Create subject
    const subject = await CurriculumService.createSubject({
      code: testSubjectCode,
      nameBn: "রসায়ন ১ম পত্র (টেস্ট)",
      nameEn: "Chemistry 1st Paper (Test)",
      category: ExamCategoryType.HSC,
      classId: cls!.id,
    });
    expect(subject).toBeDefined();
    expect(subject.code).toBe(testSubjectCode);

    // 2. Create paper 1
    const paper = await CurriculumService.createPaper({
      subjectId: subject.id,
      paperNumber: 1,
      nameBn: "১ম পত্র",
      nameEn: "1st Paper",
    });
    expect(paper.paperNumber).toBe(1);

    // 3. Create chapter
    const chapter = await CurriculumService.createChapter({
      subjectId: subject.id,
      chapterNum: 1,
      nameBn: "ল্যাবরেটরির নিরাপদ ব্যবহার",
      nameEn: "Safe use of Laboratory",
    });
    expect(chapter.chapterNum).toBe(1);

    // 4. Create topic
    const topic = await CurriculumService.createTopic({
      chapterId: chapter.id,
      nameBn: "ল্যাবরেটরির নিরাপত্তা সামগ্রী",
      nameEn: "Laboratory Safety Equipment",
      orderIndex: 1,
    });
    expect(topic.nameBn).toBe("ল্যাবরেটরির নিরাপত্তা সামগ্রী");

    // Verify relationships in query
    const chapters = await CurriculumService.listChapters({ subjectId: subject.id, onlyActive: false });
    expect(chapters.length).toBe(1);
    expect(chapters[0].nameBn).toBe("ল্যাবরেটরির নিরাপদ ব্যবহার");
  });

  it("should enforce safe deletion guard when deleting subject with chapters", async () => {
    const subject = await prisma.subject.findFirst({ where: { code: testSubjectCode } });
    expect(subject).toBeDefined();

    // Trying to delete subject directly when chapters exist must throw error
    await expect(CurriculumService.deleteSubject(subject!.id)).rejects.toThrow(
      /Cannot delete subject:.*chapter\(s\) exist/
    );

    // Instead, soft-archiving should succeed smoothly
    const archived = await CurriculumService.updateSubject(subject!.id, { isActive: false });
    expect(archived.isActive).toBe(false);
  });

  it("should create examination board and verify list", async () => {
    const board = await CurriculumService.createBoard({
      code: testBoardCode,
      nameBn: "বগুড়া বোর্ড (টেস্ট)",
      nameEn: "Bogra Board (Test)",
    });
    expect(board.code).toBe(testBoardCode);

    const boards = await CurriculumService.listBoards(false);
    expect(boards.some((b) => b.code === testBoardCode)).toBe(true);
  });
});
