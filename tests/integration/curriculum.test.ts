import { describe, it, expect, afterAll } from "vitest";
import prisma from "@/lib/db/prisma";
import { CurriculumService } from "@/lib/curriculum/curriculumService";
import { ExamCategoryType } from "@prisma/client";

describe("Curriculum Management Integration Tests", () => {
  const testClassCode = "TEST_CLASS_10";
  const testSubjectCode = "TEST_CHEM_1";
  const testBoardCode = "TEST_BOG";
  const testGroupCode = "TEST_GRP_1";

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
    await prisma.academicGroup.deleteMany({
      where: { code: testGroupCode },
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

  it("should default category to HSC when creating subject without category", async () => {
    const testCode = "TEST_DEFAULT_CAT_" + Date.now();
    const subject = await CurriculumService.createSubject({
      code: testCode,
      nameBn: "ডিফল্ট ক্যাটাগরি বিষয়",
    });
    expect(subject).toBeDefined();
    expect(subject.category).toBe(ExamCategoryType.HSC);
    expect(subject.nameEn).toBe(testCode);

    // Clean up
    await prisma.subject.delete({ where: { id: subject.id } });
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

  it("should create, list, and update academic groups", async () => {
    const group = await CurriculumService.createGroup({
      code: testGroupCode,
      nameBn: "কারিগরি শাখা (টেস্ট)",
      nameEn: "Vocational Stream (Test)",
      orderIndex: 5,
    });
    expect(group).toBeDefined();
    expect(group.code).toBe(testGroupCode);
    expect(group.nameBn).toBe("কারিগরি শাখা (টেস্ট)");

    const allGroups = await CurriculumService.listGroups(false);
    const found = allGroups.find((g) => g.code === testGroupCode);
    expect(found).toBeDefined();

    const updated = await CurriculumService.updateGroup(group.id, {
      nameEn: "Vocational Stream Updated",
      isActive: false,
    });
    expect(updated.nameEn).toBe("Vocational Stream Updated");
    expect(updated.isActive).toBe(false);

    // Re-activate
    await CurriculumService.updateGroup(group.id, { isActive: true });
  });

  it("should link subject with academic group and prevent deleting group with linked subjects", async () => {
    const group = await prisma.academicGroup.findUnique({ where: { code: testGroupCode } });
    expect(group).toBeDefined();

    const subject = await prisma.subject.findFirst({ where: { code: testSubjectCode } });
    expect(subject).toBeDefined();

    // Link subject to the group
    const updatedSubject = await CurriculumService.updateSubject(subject!.id, {
      groupId: group!.id,
    });
    expect(updatedSubject.groupId).toBe(group!.id);

    // Group safe deletion guard must trigger
    await expect(CurriculumService.deleteGroup(group!.id)).rejects.toThrow(
      /Cannot delete group:.*subject\(s\) are linked to it/
    );

    // Unlink subject from group
    await CurriculumService.updateSubject(subject!.id, { groupId: null });

    // Now deleting the group should succeed
    const deletedGroup = await CurriculumService.deleteGroup(group!.id);
    expect(deletedGroup.id).toBe(group!.id);
  });

  it("should update class and enforce safe deletion guard when subjects are assigned", async () => {
    const cls = await prisma.academicClass.findUnique({ where: { code: testClassCode } });
    expect(cls).toBeDefined();

    // Update class details
    const updatedClass = await CurriculumService.updateClass(cls!.id, {
      nameBn: "দশম শ্রেণি (হালনাগাদ)",
      nameEn: "Class 10 (Updated)",
    });
    expect(updatedClass.nameBn).toBe("দশম শ্রেণি (হালনাগাদ)");

    // Safe deletion guard must trigger because testSubjectCode is assigned to it
    await expect(CurriculumService.deleteClass(cls!.id)).rejects.toThrow(
      /Cannot delete class:.*subject\(s\) are linked to it/
    );
  });
});
