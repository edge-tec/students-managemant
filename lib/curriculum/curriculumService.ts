import prisma from "@/lib/db/prisma";
import { ExamCategoryType, EnrollmentStatus, UserRoleType } from "@prisma/client";
import { AuditService } from "@/lib/audit/auditService";

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

  static async updateClass(
    id: string,
    data: { code?: string; nameEn?: string; nameBn?: string; orderIndex?: number; isActive?: boolean }
  ) {
    const updateData: Record<string, unknown> = {};
    if (data.nameEn !== undefined) updateData.nameEn = data.nameEn.trim();
    if (data.nameBn !== undefined) updateData.nameBn = data.nameBn.trim();
    if (data.orderIndex !== undefined) updateData.orderIndex = data.orderIndex;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;
    if (data.code !== undefined) {
      const cleanCode = data.code.trim().toUpperCase();
      const existing = await prisma.academicClass.findFirst({
        where: { code: cleanCode, NOT: { id } },
      });
      if (existing) {
        throw new Error(`Academic class with code '${cleanCode}' already exists.`);
      }
      updateData.code = cleanCode;
    }

    return prisma.academicClass.update({
      where: { id },
      data: updateData,
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
  // ACADEMIC GROUPS (Science, Business Studies, Humanities, General, Vocational)
  // -------------------------------------------------------------------------
  static async listGroups(onlyActive = true) {
    return prisma.academicGroup.findMany({
      where: onlyActive ? { isActive: true } : undefined,
      orderBy: { orderIndex: "asc" },
      include: {
        subjects: {
          where: onlyActive ? { isActive: true } : undefined,
          select: { id: true, code: true, nameEn: true, nameBn: true, category: true },
        },
        _count: { select: { subjects: true } },
      },
    });
  }

  static async getGroupById(id: string) {
    return prisma.academicGroup.findUnique({
      where: { id },
      include: {
        subjects: {
          orderBy: { orderIndex: "asc" },
          select: { id: true, code: true, nameEn: true, nameBn: true, category: true, classId: true },
        },
        _count: { select: { subjects: true } },
      },
    });
  }

  static async createGroup(data: { code: string; nameEn: string; nameBn: string; orderIndex?: number }) {
    const cleanCode = data.code.trim().toUpperCase();
    const existing = await prisma.academicGroup.findUnique({ where: { code: cleanCode } });
    if (existing) {
      throw new Error(`Academic group with code '${cleanCode}' already exists.`);
    }
    return prisma.academicGroup.create({
      data: {
        code: cleanCode,
        nameEn: data.nameEn.trim(),
        nameBn: data.nameBn.trim(),
        orderIndex: data.orderIndex ?? 0,
      },
    });
  }

  static async updateGroup(
    id: string,
    data: { code?: string; nameEn?: string; nameBn?: string; orderIndex?: number; isActive?: boolean }
  ) {
    const updateData: Record<string, unknown> = {};
    if (data.nameEn !== undefined) updateData.nameEn = data.nameEn.trim();
    if (data.nameBn !== undefined) updateData.nameBn = data.nameBn.trim();
    if (data.orderIndex !== undefined) updateData.orderIndex = data.orderIndex;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;
    if (data.code !== undefined) {
      const cleanCode = data.code.trim().toUpperCase();
      const existing = await prisma.academicGroup.findFirst({
        where: { code: cleanCode, NOT: { id } },
      });
      if (existing) {
        throw new Error(`Academic group with code '${cleanCode}' already exists.`);
      }
      updateData.code = cleanCode;
    }

    return prisma.academicGroup.update({
      where: { id },
      data: updateData,
    });
  }

  static async deleteGroup(id: string) {
    const subjectCount = await prisma.subject.count({ where: { groupId: id } });
    if (subjectCount > 0) {
      throw new Error(
        `Cannot delete group: ${subjectCount} subject(s) are linked to it. Please archive or reassign subjects first.`
      );
    }
    return prisma.academicGroup.delete({ where: { id } });
  }

  // -------------------------------------------------------------------------
  // SUBJECTS
  // -------------------------------------------------------------------------
  static async listSubjects(params?: { category?: ExamCategoryType; classId?: string; groupId?: string; onlyActive?: boolean }) {
    const { category, classId, groupId, onlyActive = true } = params || {};
    return prisma.subject.findMany({
      where: {
        ...(category ? { category } : {}),
        ...(classId ? { classId } : {}),
        ...(groupId ? { groupId } : {}),
        ...(onlyActive ? { isActive: true } : {}),
      },
      orderBy: { orderIndex: "asc" },
      include: {
        academicClass: { select: { id: true, code: true, nameBn: true, nameEn: true } },
        academicGroup: { select: { id: true, code: true, nameBn: true, nameEn: true } },
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
        academicGroup: true,
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
    nameEn?: string;
    nameBn: string;
    category?: ExamCategoryType;
    classId?: string | null;
    groupId?: string | null;
    orderIndex?: number;
  }) {
    if (!data.code || !data.code.trim()) {
      throw new Error("Subject code is required.");
    }
    if (!data.nameBn || !data.nameBn.trim()) {
      throw new Error("Subject name (Bengali) is required.");
    }
    const cleanCode = data.code.trim();
    const existing = await prisma.subject.findUnique({ where: { code: cleanCode } });
    if (existing) {
      throw new Error(`Subject with code '${cleanCode}' already exists.`);
    }

    const validCategory =
      data.category && Object.values(ExamCategoryType).includes(data.category as ExamCategoryType)
        ? (data.category as ExamCategoryType)
        : ExamCategoryType.HSC;

    return prisma.subject.create({
      data: {
        code: cleanCode,
        nameEn: data.nameEn ? data.nameEn.trim() : cleanCode,
        nameBn: data.nameBn.trim(),
        category: validCategory,
        classId: data.classId || null,
        groupId: data.groupId || null,
        orderIndex: data.orderIndex ?? 0,
      },
    });
  }

  static async updateSubject(
    id: string,
    data: {
      code?: string;
      nameEn?: string;
      nameBn?: string;
      category?: ExamCategoryType;
      classId?: string | null;
      groupId?: string | null;
      orderIndex?: number;
      isActive?: boolean;
    }
  ) {
    const updateData: Record<string, unknown> = {};
    if (data.nameEn !== undefined) updateData.nameEn = data.nameEn.trim();
    if (data.nameBn !== undefined) updateData.nameBn = data.nameBn.trim();
    if (data.category !== undefined && data.category !== null) {
      if (Object.values(ExamCategoryType).includes(data.category as ExamCategoryType)) {
        updateData.category = data.category;
      }
    }
    if (data.classId !== undefined) updateData.classId = data.classId || null;
    if (data.groupId !== undefined) updateData.groupId = data.groupId || null;
    if (data.orderIndex !== undefined) updateData.orderIndex = data.orderIndex;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;
    if (data.code !== undefined) {
      const cleanCode = data.code.trim();
      const existing = await prisma.subject.findFirst({
        where: { code: cleanCode, NOT: { id } },
      });
      if (existing) {
        throw new Error(`Subject with code '${cleanCode}' already exists.`);
      }
      updateData.code = cleanCode;
    }

    return prisma.subject.update({
      where: { id },
      data: updateData,
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
    chapterNum?: number;
    nameEn?: string;
    nameBn: string;
    description?: string;
    orderIndex?: number;
  }) {
    if (!data.subjectId) {
      throw new Error("Subject ID is required for creating a chapter.");
    }
    const chapterNum = Number(data.chapterNum) || 1;
    return prisma.chapter.create({
      data: {
        subjectId: data.subjectId,
        paperId: data.paperId || null,
        chapterNum,
        nameEn: data.nameEn ? data.nameEn.trim() : `Chapter ${chapterNum}`,
        nameBn: data.nameBn ? data.nameBn.trim() : `অধ্যায় ${chapterNum}`,
        description: data.description || null,
        orderIndex: data.orderIndex ?? chapterNum,
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

  // -------------------------------------------------------------------------
  // TEACHER ASSIGNMENTS
  // -------------------------------------------------------------------------
  static async listTeacherAssignments(params?: {
    teacherId?: string;
    subjectId?: string;
    classId?: string;
    onlyActive?: boolean;
  }) {
    const { teacherId, subjectId, classId, onlyActive = true } = params || {};
    return prisma.teacherAssignment.findMany({
      where: {
        ...(teacherId ? { teacherId } : {}),
        ...(subjectId ? { subjectId } : {}),
        ...(classId ? { classId } : {}),
        ...(onlyActive ? { isActive: true } : {}),
      },
      include: {
        teacher: {
          select: { id: true, fullName: true, fullNameBn: true, email: true, phoneNumber: true },
        },
        subject: {
          select: { id: true, code: true, nameEn: true, nameBn: true, category: true },
        },
        academicClass: {
          select: { id: true, code: true, nameEn: true, nameBn: true },
        },
        assignedBy: {
          select: { id: true, fullName: true, email: true },
        },
      },
      orderBy: { assignedAt: "desc" },
    });
  }

  static async assignTeacher(
    data: {
      teacherId: string;
      subjectId: string;
      classId?: string;
      notes?: string;
    },
    actorId: string,
    ipAddress?: string
  ) {
    const teacher = await prisma.user.findUnique({
      where: { id: data.teacherId },
      include: { userRoles: { include: { role: true } } },
    });
    if (!teacher) {
      throw new Error("Teacher user not found.");
    }

    const subject = await prisma.subject.findUnique({
      where: { id: data.subjectId },
    });
    if (!subject) {
      throw new Error("Subject not found.");
    }

    if (data.classId) {
      const cls = await prisma.academicClass.findUnique({ where: { id: data.classId } });
      if (!cls) throw new Error("Academic class not found.");
    }

    const assignment = await prisma.teacherAssignment.upsert({
      where: {
        teacherId_subjectId: {
          teacherId: data.teacherId,
          subjectId: data.subjectId,
        },
      },
      create: {
        teacherId: data.teacherId,
        subjectId: data.subjectId,
        classId: data.classId || null,
        assignedById: actorId,
        isActive: true,
        notes: data.notes || null,
      },
      update: {
        classId: data.classId !== undefined ? data.classId || null : undefined,
        isActive: true,
        notes: data.notes !== undefined ? data.notes || null : undefined,
      },
      include: {
        teacher: { select: { id: true, fullName: true, email: true } },
        subject: { select: { id: true, code: true, nameEn: true, nameBn: true } },
      },
    });

    await AuditService.log({
      userId: actorId,
      action: "TEACHER_ASSIGNED",
      resource: "TeacherAssignment",
      resourceId: assignment.id,
      details: {
        teacherEmail: teacher.email,
        subjectCode: subject.code,
        classId: data.classId || null,
      },
      ipAddress,
    });

    return assignment;
  }

  static async revokeTeacherAssignment(assignmentId: string, actorId: string, ipAddress?: string) {
    const existing = await prisma.teacherAssignment.findUnique({
      where: { id: assignmentId },
      include: { teacher: true, subject: true },
    });
    if (!existing) {
      throw new Error("Teacher assignment not found.");
    }

    const updated = await prisma.teacherAssignment.update({
      where: { id: assignmentId },
      data: { isActive: false },
    });

    await AuditService.log({
      userId: actorId,
      action: "TEACHER_ASSIGNMENT_REVOKED",
      resource: "TeacherAssignment",
      resourceId: assignmentId,
      details: {
        teacherEmail: existing.teacher.email,
        subjectCode: existing.subject.code,
      },
      ipAddress,
    });

    return updated;
  }

  static async validateTeacherSubjectScope(teacherId: string, subjectId: string): Promise<boolean> {
    const userRoles = await prisma.userRole.findMany({
      where: { userId: teacherId },
      include: { role: true },
    });
    const roleNames = userRoles.map((ur) => ur.role.name);

    // Global staff bypass: SUPER_ADMIN, ADMIN, CONTENT_MANAGER
    if (
      roleNames.includes(UserRoleType.SUPER_ADMIN) ||
      roleNames.includes(UserRoleType.ADMIN) ||
      roleNames.includes(UserRoleType.CONTENT_MANAGER)
    ) {
      return true;
    }

    // If teacher, check active assignment
    if (roleNames.includes(UserRoleType.TEACHER)) {
      const assignment = await prisma.teacherAssignment.findFirst({
        where: {
          teacherId,
          subjectId,
          isActive: true,
        },
      });
      return !!assignment;
    }

    return false;
  }

  // -------------------------------------------------------------------------
  // STUDENT ENROLLMENTS
  // -------------------------------------------------------------------------
  static async listClassEnrollments(params?: {
    classId?: string;
    studentId?: string;
    status?: EnrollmentStatus;
    academicYear?: string;
  }) {
    const { classId, studentId, status, academicYear } = params || {};
    return prisma.classEnrollment.findMany({
      where: {
        ...(classId ? { classId } : {}),
        ...(studentId ? { studentId } : {}),
        ...(status ? { status } : {}),
        ...(academicYear ? { academicYear } : {}),
      },
      include: {
        student: {
          select: { id: true, fullName: true, fullNameBn: true, email: true, phoneNumber: true },
        },
        academicClass: {
          select: { id: true, code: true, nameEn: true, nameBn: true },
        },
      },
      orderBy: { enrolledAt: "desc" },
    });
  }

  static async enrollStudent(
    data: {
      studentId: string;
      classId: string;
      academicYear?: string;
      rollNumber?: string;
      notes?: string;
    },
    actorId: string,
    ipAddress?: string
  ) {
    const student = await prisma.user.findUnique({ where: { id: data.studentId } });
    if (!student) throw new Error("Student not found.");

    const cls = await prisma.academicClass.findUnique({ where: { id: data.classId } });
    if (!cls) throw new Error("Academic class not found.");

    const academicYear = data.academicYear || "2025-2026";

    // Check if active enrollment exists in this class & year
    const existing = await prisma.classEnrollment.findUnique({
      where: {
        studentId_classId_academicYear: {
          studentId: data.studentId,
          classId: data.classId,
          academicYear,
        },
      },
    });

    if (existing && existing.status === EnrollmentStatus.ACTIVE) {
      throw new Error(`Student is already actively enrolled in ${cls.nameEn} for ${academicYear}.`);
    }

    const enrollment = await prisma.$transaction(async (tx) => {
      const rec = await tx.classEnrollment.upsert({
        where: {
          studentId_classId_academicYear: {
            studentId: data.studentId,
            classId: data.classId,
            academicYear,
          },
        },
        create: {
          studentId: data.studentId,
          classId: data.classId,
          academicYear,
          rollNumber: data.rollNumber || null,
          status: EnrollmentStatus.ACTIVE,
          notes: data.notes || null,
        },
        update: {
          status: EnrollmentStatus.ACTIVE,
          rollNumber: data.rollNumber || null,
          transferredAt: null,
          transferReason: null,
          notes: data.notes || null,
        },
        include: {
          academicClass: true,
          student: { select: { id: true, fullName: true, email: true } },
        },
      });

      // Synchronize student preference
      await tx.studentPreference.upsert({
        where: { userId: data.studentId },
        create: {
          userId: data.studentId,
          currentClassId: data.classId,
        },
        update: {
          currentClassId: data.classId,
        },
      });

      return rec;
    });

    await AuditService.log({
      userId: actorId,
      action: "STUDENT_ENROLLED",
      resource: "ClassEnrollment",
      resourceId: enrollment.id,
      details: {
        studentEmail: student.email,
        classCode: cls.code,
        academicYear,
      },
      ipAddress,
    });

    return enrollment;
  }

  static async bulkEnrollStudents(
    data: {
      studentIds: string[];
      classId: string;
      academicYear?: string;
    },
    actorId: string,
    ipAddress?: string
  ) {
    const { studentIds, classId, academicYear = "2025-2026" } = data;
    const uniqueIds = Array.from(new Set(studentIds.filter(Boolean)));
    if (uniqueIds.length === 0) {
      return { enrolledCount: 0, skippedCount: 0 };
    }

    const cls = await prisma.academicClass.findUnique({ where: { id: classId } });
    if (!cls) throw new Error("Academic class not found.");

    let enrolledCount = 0;
    let skippedCount = 0;

    for (const sId of uniqueIds) {
      try {
        await this.enrollStudent({ studentId: sId, classId, academicYear }, actorId, ipAddress);
        enrolledCount++;
      } catch {
        skippedCount++;
      }
    }

    return { enrolledCount, skippedCount };
  }

  static async transferStudent(
    data: {
      studentId: string;
      fromClassId: string;
      toClassId: string;
      reason?: string;
      academicYear?: string;
    },
    actorId: string,
    ipAddress?: string
  ) {
    if (data.fromClassId === data.toClassId) {
      throw new Error("Target class must be different from source class.");
    }

    const targetClass = await prisma.academicClass.findUnique({ where: { id: data.toClassId } });
    if (!targetClass) throw new Error("Target academic class not found.");

    const academicYear = data.academicYear || "2025-2026";

    const result = await prisma.$transaction(async (tx) => {
      // 1. Mark existing enrollment as TRANSFERRED
      await tx.classEnrollment.updateMany({
        where: {
          studentId: data.studentId,
          classId: data.fromClassId,
          status: EnrollmentStatus.ACTIVE,
        },
        data: {
          status: EnrollmentStatus.TRANSFERRED,
          transferredAt: new Date(),
          transferReason: data.reason || "Administrative Class Transfer",
        },
      });

      // 2. Create new active enrollment in target class
      const newEnrollment = await tx.classEnrollment.upsert({
        where: {
          studentId_classId_academicYear: {
            studentId: data.studentId,
            classId: data.toClassId,
            academicYear,
          },
        },
        create: {
          studentId: data.studentId,
          classId: data.toClassId,
          academicYear,
          status: EnrollmentStatus.ACTIVE,
          notes: `Transferred from class ID ${data.fromClassId}. Reason: ${data.reason || "N/A"}`,
        },
        update: {
          status: EnrollmentStatus.ACTIVE,
          transferredAt: null,
          transferReason: null,
          notes: `Transferred from class ID ${data.fromClassId}. Reason: ${data.reason || "N/A"}`,
        },
        include: { academicClass: true },
      });

      // 3. Update student preference
      await tx.studentPreference.upsert({
        where: { userId: data.studentId },
        create: {
          userId: data.studentId,
          currentClassId: data.toClassId,
        },
        update: {
          currentClassId: data.toClassId,
        },
      });

      return newEnrollment;
    });

    await AuditService.log({
      userId: actorId,
      action: "STUDENT_TRANSFERRED",
      resource: "ClassEnrollment",
      resourceId: result.id,
      details: {
        studentId: data.studentId,
        fromClassId: data.fromClassId,
        toClassId: data.toClassId,
        targetClassCode: targetClass.code,
        reason: data.reason,
      },
      ipAddress,
    });

    return result;
  }

  // -------------------------------------------------------------------------
  // ARCHIVAL & RESTORATION
  // -------------------------------------------------------------------------
  static async setEntityActiveState(
    type: "class" | "subject" | "paper" | "chapter" | "topic" | "board",
    id: string,
    isActive: boolean,
    actorId?: string
  ) {
    let result: unknown;
    switch (type) {
      case "class":
        result = await prisma.academicClass.update({ where: { id }, data: { isActive } });
        break;
      case "subject":
        result = await prisma.subject.update({ where: { id }, data: { isActive } });
        break;
      case "paper":
        result = await prisma.paper.update({ where: { id }, data: { isActive } });
        break;
      case "chapter":
        result = await prisma.chapter.update({ where: { id }, data: { isActive } });
        break;
      case "topic":
        result = await prisma.topic.update({ where: { id }, data: { isActive } });
        break;
      case "board":
        result = await prisma.examinationBoard.update({ where: { id }, data: { isActive } });
        break;
    }

    if (actorId) {
      await AuditService.log({
        userId: actorId,
        action: isActive ? "CURRICULUM_RESTORED" : "CURRICULUM_ARCHIVED",
        resource: type.toUpperCase(),
        resourceId: id,
        details: { type, isActive },
      });
    }

    return result;
  }
}

