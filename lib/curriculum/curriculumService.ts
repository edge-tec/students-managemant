import prisma from "@/lib/db/prisma";
import { ExamCategoryType } from "@prisma/client";

export class CurriculumService {
  // -------------------------------------------------------------------------
  // ACADEMIC CLASSES (Class 9, Class 10, Class 11, Class 12, etc.)
  // -------------------------------------------------------------------------
  static async listClasses(onlyActive = true) {
    return prisma.academicClass.findMany({
      where: onlyActive ? { isActive: true } : undefined,
      orderBy: { orderIndex: "asc" },
      include: {
        subjects: {
          where: onlyActive ? { isActive: true } : undefined,
          select: { id: true, code: true, nameEn: true, nameBn: true, category: true },
        },
      },
    });
  }

  static async createClass(data: { code: string; nameEn: string; nameBn: string; orderIndex?: number }) {
    const existing = await prisma.academicClass.findUnique({ where: { code: data.code } });
    if (existing) {
      throw new Error(`Academic class with code '${data.code}' already exists.`);
    }
    return prisma.academicClass.create({
      data: {
        code: data.code,
        nameEn: data.nameEn,
        nameBn: data.nameBn,
        orderIndex: data.orderIndex ?? 0,
      },
    });
  }

  static async updateClass(id: string, data: { nameEn?: string; nameBn?: string; orderIndex?: number; isActive?: boolean }) {
    return prisma.academicClass.update({
      where: { id },
      data,
    });
  }

  static async deleteClass(id: string) {
    const subjectCount = await prisma.subject.count({ where: { classId: id } });
    if (subjectCount > 0) {
      throw new Error(
        `Cannot delete class: ${subjectCount} subject(s) are linked to it. Please archive or reassign subjects first.`
      );
    }
    return prisma.academicClass.delete({ where: { id } });
  }

  // -------------------------------------------------------------------------
  // SUBJECTS
  // -------------------------------------------------------------------------
  static async listSubjects(params?: { category?: ExamCategoryType; classId?: string; onlyActive?: boolean }) {
    const { category, classId, onlyActive = true } = params || {};
    return prisma.subject.findMany({
      where: {
        ...(category ? { category } : {}),
        ...(classId ? { classId } : {}),
        ...(onlyActive ? { isActive: true } : {}),
      },
      orderBy: { orderIndex: "asc" },
      include: {
        academicClass: { select: { id: true, code: true, nameBn: true, nameEn: true } },
        papers: {
          where: onlyActive ? { isActive: true } : undefined,
          orderBy: { paperNumber: "asc" },
        },
        chapters: {
          where: onlyActive ? { isActive: true } : undefined,
          orderBy: { chapterNum: "asc" },
          select: { id: true, chapterNum: true, nameBn: true, nameEn: true },
        },
        _count: { select: { questions: true } },
      },
    });
  }

  static async getSubjectById(id: string) {
    return prisma.subject.findUnique({
      where: { id },
      include: {
        academicClass: true,
        papers: { orderBy: { paperNumber: "asc" } },
        chapters: {
          orderBy: { chapterNum: "asc" },
          include: {
            topics: { orderBy: { orderIndex: "asc" } },
            _count: { select: { questions: true } },
          },
        },
        _count: { select: { questions: true } },
      },
    });
  }

  static async createSubject(data: {
    code: string;
    nameEn: string;
    nameBn: string;
    category: ExamCategoryType;
    classId?: string;
    orderIndex?: number;
  }) {
    const existing = await prisma.subject.findUnique({ where: { code: data.code } });
    if (existing) {
      throw new Error(`Subject with code '${data.code}' already exists.`);
    }
    return prisma.subject.create({
      data: {
        code: data.code,
        nameEn: data.nameEn,
        nameBn: data.nameBn,
        category: data.category,
        classId: data.classId || null,
        orderIndex: data.orderIndex ?? 0,
      },
    });
  }

  static async updateSubject(
    id: string,
    data: {
      nameEn?: string;
      nameBn?: string;
      category?: ExamCategoryType;
      classId?: string;
      orderIndex?: number;
      isActive?: boolean;
    }
  ) {
    return prisma.subject.update({
      where: { id },
      data,
    });
  }

  static async deleteSubject(id: string) {
    // Guard against deleting referenced subjects
    const questionCount = await prisma.question.count({ where: { subjectId: id } });
    if (questionCount > 0) {
      throw new Error(
        `Cannot delete subject: ${questionCount} question(s) reference it. Please archive it (isActive: false) instead.`
      );
    }
    const chapterCount = await prisma.chapter.count({ where: { subjectId: id } });
    if (chapterCount > 0) {
      throw new Error(
        `Cannot delete subject: ${chapterCount} chapter(s) exist under it. Please delete or reassign chapters first.`
      );
    }
    return prisma.subject.delete({ where: { id } });
  }

  // -------------------------------------------------------------------------
  // PAPERS (1st Paper, 2nd Paper)
  // -------------------------------------------------------------------------
  static async listPapers(subjectId: string, onlyActive = true) {
    return prisma.paper.findMany({
      where: {
        subjectId,
        ...(onlyActive ? { isActive: true } : {}),
      },
      orderBy: { paperNumber: "asc" },
      include: {
        chapters: {
          where: onlyActive ? { isActive: true } : undefined,
          orderBy: { chapterNum: "asc" },
        },
        _count: { select: { questions: true } },
      },
    });
  }

  static async createPaper(data: { subjectId: string; paperNumber: number; nameEn: string; nameBn: string }) {
    const existing = await prisma.paper.findUnique({
      where: { subjectId_paperNumber: { subjectId: data.subjectId, paperNumber: data.paperNumber } },
    });
    if (existing) {
      throw new Error(`Paper ${data.paperNumber} already exists for this subject.`);
    }
    return prisma.paper.create({ data });
  }

  static async updatePaper(id: string, data: { nameEn?: string; nameBn?: string; isActive?: boolean }) {
    return prisma.paper.update({
      where: { id },
      data,
    });
  }

  static async deletePaper(id: string) {
    const questionCount = await prisma.question.count({ where: { paperId: id } });
    if (questionCount > 0) {
      throw new Error(`Cannot delete paper: ${questionCount} question(s) reference it. Archive it instead.`);
    }
    const chapterCount = await prisma.chapter.count({ where: { paperId: id } });
    if (chapterCount > 0) {
      throw new Error(`Cannot delete paper: ${chapterCount} chapter(s) reference it.`);
    }
    return prisma.paper.delete({ where: { id } });
  }

  // -------------------------------------------------------------------------
  // CHAPTERS
  // -------------------------------------------------------------------------
  static async listChapters(params: { subjectId: string; paperId?: string; onlyActive?: boolean }) {
    const { subjectId, paperId, onlyActive = true } = params;
    return prisma.chapter.findMany({
      where: {
        subjectId,
        ...(paperId ? { paperId } : {}),
        ...(onlyActive ? { isActive: true } : {}),
      },
      orderBy: { chapterNum: "asc" },
      include: {
        topics: {
          where: onlyActive ? { isActive: true } : undefined,
          orderBy: { orderIndex: "asc" },
        },
        paper: { select: { id: true, paperNumber: true, nameBn: true, nameEn: true } },
        _count: { select: { questions: true } },
      },
    });
  }

  static async createChapter(data: {
    subjectId: string;
    paperId?: string;
    chapterNum: number;
    nameEn: string;
    nameBn: string;
    description?: string;
    orderIndex?: number;
  }) {
    return prisma.chapter.create({
      data: {
        subjectId: data.subjectId,
        paperId: data.paperId || null,
        chapterNum: data.chapterNum,
        nameEn: data.nameEn,
        nameBn: data.nameBn,
        description: data.description || null,
        orderIndex: data.orderIndex ?? data.chapterNum,
      },
    });
  }

  static async updateChapter(
    id: string,
    data: {
      chapterNum?: number;
      nameEn?: string;
      nameBn?: string;
      description?: string;
      orderIndex?: number;
      isActive?: boolean;
    }
  ) {
    return prisma.chapter.update({
      where: { id },
      data,
    });
  }

  static async deleteChapter(id: string) {
    const questionCount = await prisma.question.count({ where: { chapterId: id } });
    if (questionCount > 0) {
      throw new Error(
        `Cannot delete chapter: ${questionCount} question(s) reference it. Please archive it (isActive: false) instead.`
      );
    }
    const topicCount = await prisma.topic.count({ where: { chapterId: id } });
    if (topicCount > 0) {
      throw new Error(`Cannot delete chapter: ${topicCount} topic(s) exist under it.`);
    }
    return prisma.chapter.delete({ where: { id } });
  }

  // -------------------------------------------------------------------------
  // TOPICS
  // -------------------------------------------------------------------------
  static async listTopics(chapterId: string, onlyActive = true) {
    return prisma.topic.findMany({
      where: {
        chapterId,
        ...(onlyActive ? { isActive: true } : {}),
      },
      orderBy: { orderIndex: "asc" },
      include: {
        _count: { select: { questions: true } },
      },
    });
  }

  static async createTopic(data: { chapterId: string; nameEn: string; nameBn: string; orderIndex?: number }) {
    return prisma.topic.create({
      data: {
        chapterId: data.chapterId,
        nameEn: data.nameEn,
        nameBn: data.nameBn,
        orderIndex: data.orderIndex ?? 0,
      },
    });
  }

  static async updateTopic(id: string, data: { nameEn?: string; nameBn?: string; orderIndex?: number; isActive?: boolean }) {
    return prisma.topic.update({
      where: { id },
      data,
    });
  }

  static async deleteTopic(id: string) {
    const questionCount = await prisma.question.count({ where: { topicId: id } });
    if (questionCount > 0) {
      throw new Error(
        `Cannot delete topic: ${questionCount} question(s) reference it. Please archive it (isActive: false) instead.`
      );
    }
    return prisma.topic.delete({ where: { id } });
  }

  // -------------------------------------------------------------------------
  // EXAMINATION BOARDS
  // -------------------------------------------------------------------------
  static async listBoards(onlyActive = true) {
    return prisma.examinationBoard.findMany({
      where: onlyActive ? { isActive: true } : undefined,
      orderBy: { code: "asc" },
      include: {
        _count: { select: { questions: true } },
      },
    });
  }

  static async createBoard(data: { code: string; nameEn: string; nameBn: string }) {
    const existing = await prisma.examinationBoard.findUnique({ where: { code: data.code } });
    if (existing) {
      throw new Error(`Examination board with code '${data.code}' already exists.`);
    }
    return prisma.examinationBoard.create({
      data: {
        code: data.code.toUpperCase(),
        nameEn: data.nameEn,
        nameBn: data.nameBn,
      },
    });
  }

  static async updateBoard(id: string, data: { nameEn?: string; nameBn?: string; isActive?: boolean }) {
    return prisma.examinationBoard.update({
      where: { id },
      data,
    });
  }

  static async deleteBoard(id: string) {
    const refCount = await prisma.questionReference.count({ where: { boardId: id } });
    if (refCount > 0) {
      throw new Error(
        `Cannot delete board: ${refCount} question reference(s) exist for this board. Please archive it (isActive: false) instead.`
      );
    }
    return prisma.examinationBoard.delete({ where: { id } });
  }
}

