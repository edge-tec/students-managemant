import { describe, it, expect, beforeAll, afterAll } from "vitest";
import prisma from "@/lib/db/prisma";
import { AdminUserService } from "@/lib/admin/userService";
import { CurriculumService } from "@/lib/curriculum/curriculumService";
import { QuestionService } from "@/lib/questions/questionService";
import { verifyPassword } from "@/lib/auth/password";
import {
  UserRoleType,
  ExamCategoryType,
  QuestionType,
  EnrollmentStatus,
} from "@prisma/client";

describe("Phase 6: User Management, Curriculum & Academic Administration", () => {
  const p6Prefix = "p6_test_";
  let superAdminId: string;
  let testTeacherId: string;
  let testStudentId: string;
  let testStudentEmail: string;
  let testClassId: string;
  let testTargetClassId: string;
  let testSubjectId: string;
  let otherSubjectId: string;
  let testChapterId: string;

  beforeAll(async () => {
    // 1. Ensure seed roles
    for (const r of Object.values(UserRoleType)) {
      await prisma.role.upsert({
        where: { name: r },
        create: { name: r, description: `${r} role` },
        update: {},
      });
    }

    // 2. Setup Super Admin
    const superAdmin = await prisma.user.upsert({
      where: { email: `${p6Prefix}superadmin@edubd.ac` },
      create: {
        email: `${p6Prefix}superadmin@edubd.ac`,
        fullName: "P6 Super Administrator",
        passwordHash: "secure-hash",
        isActive: true,
      },
      update: { isActive: true },
    });
    superAdminId = superAdmin.id;
    const superAdminRole = await prisma.role.findUnique({ where: { name: UserRoleType.SUPER_ADMIN } });
    if (superAdminRole) {
      await prisma.userRole.upsert({
        where: { userId_roleId: { userId: superAdmin.id, roleId: superAdminRole.id } },
        create: { userId: superAdmin.id, roleId: superAdminRole.id },
        update: {},
      });
    }

    // 3. Setup Academic Classes
    const cls1 = await prisma.academicClass.upsert({
      where: { code: `${p6Prefix}CLASS_11` },
      create: {
        code: `${p6Prefix}CLASS_11`,
        nameEn: "Class 11 P6",
        nameBn: "একাদশ শ্রেণি পি৬",
        orderIndex: 11,
        isActive: true,
      },
      update: {},
    });
    testClassId = cls1.id;

    const cls2 = await prisma.academicClass.upsert({
      where: { code: `${p6Prefix}CLASS_12` },
      create: {
        code: `${p6Prefix}CLASS_12`,
        nameEn: "Class 12 P6",
        nameBn: "দ্বাদশ শ্রেণি পি৬",
        orderIndex: 12,
        isActive: true,
      },
      update: {},
    });
    testTargetClassId = cls2.id;

    // 4. Setup Subjects
    const sub1 = await prisma.subject.upsert({
      where: { code: `${p6Prefix}PHY_1` },
      create: {
        code: `${p6Prefix}PHY_1`,
        nameEn: "Physics 1st Paper P6",
        nameBn: "পদার্থবিজ্ঞান ১ম পত্র পি৬",
        category: ExamCategoryType.HSC,
        classId: testClassId,
      },
      update: {},
    });
    testSubjectId = sub1.id;

    const sub2 = await prisma.subject.upsert({
      where: { code: `${p6Prefix}CHEM_1` },
      create: {
        code: `${p6Prefix}CHEM_1`,
        nameEn: "Chemistry 1st Paper P6",
        nameBn: "রসায়ন ১ম পত্র পি৬",
        category: ExamCategoryType.HSC,
        classId: testClassId,
      },
      update: {},
    });
    otherSubjectId = sub2.id;

    // 5. Setup Chapter for testSubject
    const chap = await prisma.chapter.create({
      data: {
        subjectId: testSubjectId,
        chapterNum: 1,
        nameEn: "Physical World and Measurement P6",
        nameBn: "ভৌত জগত ও পরিমাপ পি৬",
      },
    });
    testChapterId = chap.id;
  });

  afterAll(async () => {
    // Clean up created entities safely
    await prisma.question.deleteMany({
      where: { questionTextBn: { contains: p6Prefix } },
    });
    await prisma.teacherAssignment.deleteMany({
      where: { teacher: { email: { contains: p6Prefix } } },
    });
    await prisma.classEnrollment.deleteMany({
      where: { student: { email: { contains: p6Prefix } } },
    });
    await prisma.chapter.deleteMany({
      where: { id: testChapterId },
    });
    await prisma.subject.deleteMany({
      where: { id: { in: [testSubjectId, otherSubjectId] } },
    });
    await prisma.academicClass.deleteMany({
      where: { id: { in: [testClassId, testTargetClassId] } },
    });
    await prisma.user.deleteMany({
      where: { email: { contains: p6Prefix } },
    });
  });

  describe("1. Admin User Management & Account Lifecycle", () => {
    let createdUserId: string;

    it("should create a user account with hashed password and academic profile", async () => {
      const email = `${p6Prefix}student1@edubd.ac`;
      const created = await AdminUserService.createUser(
        {
          email,
          fullName: "Mahim Chowdhury",
          fullNameBn: "মাহিম চৌধুরী",
          phoneNumber: "01700998877",
          preferredLang: "bn",
          roles: [UserRoleType.STUDENT],
          profile: {
            institutionName: "Rajuk Uttara Model College",
            targetCategory: ExamCategoryType.HSC,
            district: "Dhaka",
            hscYear: 2026,
          },
        },
        superAdminId
      );

      expect(created.id).toBeDefined();
      expect(created.email).toBe(email);
      expect(created.fullName).toBe("Mahim Chowdhury");
      expect(created.roles).toContain(UserRoleType.STUDENT);
      expect(created.generatedPassword).toBeDefined();

      createdUserId = created.id;
      testStudentId = created.id;
      testStudentEmail = created.email;

      // Verify in DB that password was securely hashed (not stored plain)
      const inDb = await prisma.user.findUnique({
        where: { id: created.id },
        include: { profile: true },
      });
      expect(inDb?.passwordHash).not.toBe(created.generatedPassword);
      expect(inDb?.passwordHash.startsWith("$2")).toBe(true);
      expect(inDb?.profile?.institutionName).toBe("Rajuk Uttara Model College");
      expect(inDb?.profile?.district).toBe("Dhaka");
    });

    it("should prevent creating user with duplicate email", async () => {
      await expect(
        AdminUserService.createUser(
          {
            email: `${p6Prefix}student1@edubd.ac`,
            fullName: "Duplicate User",
          },
          superAdminId
        )
      ).rejects.toThrow(/already exists/);
    });

    it("should update a user's profile information cleanly", async () => {
      const updated = await AdminUserService.updateUserProfile(
        createdUserId,
        {
          fullName: "Mahim Chowdhury (Updated)",
          profile: {
            institutionName: "Notre Dame College, Dhaka",
            district: "Dhaka",
            bio: "Future Medical Aspirant",
          },
        },
        superAdminId
      );

      expect(updated.fullName).toBe("Mahim Chowdhury (Updated)");

      const inDb = await prisma.userProfile.findUnique({
        where: { userId: createdUserId },
      });
      expect(inDb?.institutionName).toBe("Notre Dame College, Dhaka");
      expect(inDb?.bio).toBe("Future Medical Aspirant");
    });

    it("should toggle account status and protect last Super Admin", async () => {
      // Suspend student
      const suspended = await AdminUserService.updateUserStatus(
        createdUserId,
        false,
        "Violation of exam conduct",
        superAdminId
      );
      expect(suspended.isActive).toBe(false);

      // Reactivate student
      const reactivated = await AdminUserService.updateUserStatus(
        createdUserId,
        true,
        "Account reinstated",
        superAdminId
      );
      expect(reactivated.isActive).toBe(true);

      // Verify Last Super Admin guard: when only 1 active superadmin remains, suspending it must throw
      const otherSuperAdmins = await prisma.user.findMany({
        where: {
          id: { not: superAdminId },
          isActive: true,
          userRoles: { some: { role: { name: UserRoleType.SUPER_ADMIN } } },
        },
        select: { id: true },
      });
      const otherIds = otherSuperAdmins.map((u) => u.id);

      if (otherIds.length > 0) {
        await prisma.user.updateMany({
          where: { id: { in: otherIds } },
          data: { isActive: false },
        });
      }

      try {
        await expect(
          AdminUserService.updateUserStatus(
            superAdminId,
            false,
            "Attempt to suspend sole superadmin",
            superAdminId
          )
        ).rejects.toThrow("Security Violation: Cannot suspend the last remaining Super Administrator.");
      } finally {
        if (otherIds.length > 0) {
          await prisma.user.updateMany({
            where: { id: { in: otherIds } },
            data: { isActive: true },
          });
        }
      }
    });

    it("should execute bulk status update with safety filters", async () => {
      const bulkRes = await AdminUserService.bulkUpdateStatus(
        [createdUserId],
        false,
        "Bulk suspension test",
        superAdminId
      );
      expect(bulkRes.updatedCount).toBe(1);

      // Verify suspended
      const user = await prisma.user.findUnique({ where: { id: createdUserId } });
      expect(user?.isActive).toBe(false);

      // Bulk reactivate
      await AdminUserService.bulkUpdateStatus(
        [createdUserId],
        true,
        "Bulk reactivate test",
        superAdminId
      );
      const userActive = await prisma.user.findUnique({ where: { id: createdUserId } });
      expect(userActive?.isActive).toBe(true);
    });

    it("should execute bulk role assignment", async () => {
      const result = await AdminUserService.bulkAssignRole(
        [createdUserId],
        UserRoleType.TEACHER,
        superAdminId
      );
      expect(result.affectedCount).toBe(1);

      const userRoles = await prisma.userRole.findMany({
        where: { userId: createdUserId },
        include: { role: true },
      });
      expect(userRoles.some((ur) => ur.role.name === UserRoleType.TEACHER)).toBe(true);
    });
  });

  describe("2. Safe CSV User Bulk Import", () => {
    it("should process valid rows, report errors for invalid rows, and detect duplicates", async () => {
      const testRows = [
        {
          email: `${p6Prefix}import1@edubd.ac`,
          fullName: "Import User One",
          role: "STUDENT",
          institution: "Dhaka College",
          targetCategory: "HSC",
        },
        {
          email: "invalid-email-format", // Invalid email format
          fullName: "Invalid User",
        },
        {
          email: `${p6Prefix}import2@edubd.ac`,
          fullName: "", // Missing full name
        },
        {
          email: `${p6Prefix}import1@edubd.ac`, // Duplicate email within batch
          fullName: "Duplicate User In Batch",
        },
      ];

      const report = await AdminUserService.importUsersFromCsv(testRows, superAdminId);

      expect(report.totalRows).toBe(4);
      expect(report.successfulRows).toBe(1);
      expect(report.failedRows).toBe(3);
      expect(report.errors.length).toBe(3);

      // Verify first user was created
      const importedUser = await prisma.user.findUnique({
        where: { email: `${p6Prefix}import1@edubd.ac` },
        include: { profile: true, userRoles: { include: { role: true } } },
      });
      expect(importedUser).toBeDefined();
      expect(importedUser?.fullName).toBe("Import User One");
      expect(importedUser?.profile?.institutionName).toBe("Dhaka College");
      expect(importedUser?.userRoles.some((ur) => ur.role.name === UserRoleType.STUDENT)).toBe(true);

      // Now retry importing import1: it should detect database duplicate!
      const retryReport = await AdminUserService.importUsersFromCsv(
        [
          {
            email: `${p6Prefix}import1@edubd.ac`,
            fullName: "Retry Import",
          },
        ],
        superAdminId
      );
      expect(retryReport.failedRows).toBe(1);
      expect(retryReport.errors[0].errorMessage).toContain("already exists in database");
    });
  });

  describe("3. Teacher Assignments & Scope Enforcement", () => {
    let teacherUser: any;

    beforeAll(async () => {
      // Create dedicated teacher account
      teacherUser = await prisma.user.create({
        data: {
          email: `${p6Prefix}physics_teacher@edubd.ac`,
          fullName: "Engr. Tanvir Ahmed",
          fullNameBn: "প্রকৌ. তানভীর আহমেদ",
          passwordHash: "secure-hash",
          isActive: true,
          userRoles: {
            create: {
              role: {
                connect: { name: UserRoleType.TEACHER },
              },
            },
          },
        },
      });
      testTeacherId = teacherUser.id;
    });

    it("should assign teacher to a subject and query assignments", async () => {
      const assignment = await CurriculumService.assignTeacher(
        {
          teacherId: testTeacherId,
          subjectId: testSubjectId,
          classId: testClassId,
          notes: "Primary HSC Physics Instructor",
        },
        superAdminId
      );

      expect(assignment.id).toBeDefined();
      expect(assignment.teacherId).toBe(testTeacherId);
      expect(assignment.subjectId).toBe(testSubjectId);
      expect(assignment.isActive).toBe(true);

      const list = await CurriculumService.listTeacherAssignments({
        teacherId: testTeacherId,
      });
      expect(list.length).toBe(1);
      expect(list[0].subject.code).toBe(`${p6Prefix}PHY_1`);
    });

    it("should strictly enforce teacher assignment scope on question creation", async () => {
      // 1. Creating question for ASSIGNED subject (Physics) -> MUST SUCCEED
      const validQ = await QuestionService.createQuestion(
        {
          category: ExamCategoryType.HSC,
          subjectId: testSubjectId,
          chapterId: testChapterId,
          type: QuestionType.MCQ,
          questionTextBn: `${p6Prefix} বলের এসআই একক কোনটি?`,
          options: [
            { optionKey: "A", textBn: "নিউটন (N)", isCorrect: true },
            { optionKey: "B", textBn: "জুল (J)", isCorrect: false },
          ],
          answer: { correctKey: "A", explanationBn: "বলের একক নিউটন।" },
        },
        testTeacherId
      );
      expect(validQ.id).toBeDefined();

      // 2. Creating question for UNASSIGNED subject (Chemistry) -> MUST BE BLOCKED
      await expect(
        QuestionService.createQuestion(
          {
            category: ExamCategoryType.HSC,
            subjectId: otherSubjectId, // Chemistry - unassigned!
            chapterId: testChapterId,
            type: QuestionType.MCQ,
            questionTextBn: `${p6Prefix} অ্যাসিডের পিএইচ কত?`,
            options: [
              { optionKey: "A", textBn: "< 7", isCorrect: true },
              { optionKey: "B", textBn: "> 7", isCorrect: false },
            ],
            answer: { correctKey: "A" },
          },
          testTeacherId
        )
      ).rejects.toThrow("Access Denied: Teacher is not assigned to this subject.");
    });

    it("should revoke teacher assignment cleanly", async () => {
      const list = await CurriculumService.listTeacherAssignments({
        teacherId: testTeacherId,
      });
      expect(list.length).toBe(1);

      const revoked = await CurriculumService.revokeTeacherAssignment(list[0].id, superAdminId);
      expect(revoked.isActive).toBe(false);

      const activeList = await CurriculumService.listTeacherAssignments({
        teacherId: testTeacherId,
        onlyActive: true,
      });
      expect(activeList.length).toBe(0);
    });
  });

  describe("4. Student Enrollment & Academic Class Transfers", () => {
    it("should enroll student into academic class and sync student preference", async () => {
      const enrollment = await CurriculumService.enrollStudent(
        {
          studentId: testStudentId,
          classId: testClassId,
          academicYear: "2025-2026",
          rollNumber: "101",
          notes: "Science Group HSC",
        },
        superAdminId
      );

      expect(enrollment.id).toBeDefined();
      expect(enrollment.status).toBe(EnrollmentStatus.ACTIVE);
      expect(enrollment.rollNumber).toBe("101");

      // Verify sync with StudentPreference
      const pref = await prisma.studentPreference.findUnique({
        where: { userId: testStudentId },
      });
      expect(pref?.currentClassId).toBe(testClassId);
    });

    it("should prevent duplicate active enrollment in same class & academic year", async () => {
      await expect(
        CurriculumService.enrollStudent(
          {
            studentId: testStudentId,
            classId: testClassId,
            academicYear: "2025-2026",
          },
          superAdminId
        )
      ).rejects.toThrow(/already actively enrolled/);
    });

    it("should transfer student to next class preserving historical enrollment", async () => {
      const transfer = await CurriculumService.transferStudent(
        {
          studentId: testStudentId,
          fromClassId: testClassId,
          toClassId: testTargetClassId,
          reason: "Annual Exam Promotion to Class 12",
          academicYear: "2026-2027",
        },
        superAdminId
      );

      expect(transfer.status).toBe(EnrollmentStatus.ACTIVE);
      expect(transfer.classId).toBe(testTargetClassId);

      // Verify previous enrollment was marked TRANSFERRED
      const oldEnrollment = await prisma.classEnrollment.findFirst({
        where: { studentId: testStudentId, classId: testClassId },
      });
      expect(oldEnrollment?.status).toBe(EnrollmentStatus.TRANSFERRED);
      expect(oldEnrollment?.transferReason).toBe("Annual Exam Promotion to Class 12");
      expect(oldEnrollment?.transferredAt).toBeDefined();

      // Verify preference updated to new class
      const pref = await prisma.studentPreference.findUnique({
        where: { userId: testStudentId },
      });
      expect(pref?.currentClassId).toBe(testTargetClassId);
    });
  });

  describe("5. User Full Learning Activity & History", () => {
    it("should retrieve aggregated learning history and examination attempts", async () => {
      const history = await AdminUserService.getUserFullLearningHistory(testStudentId);

      expect(history.user.email).toContain(p6Prefix);
      expect(history.academic.classEnrollments.length).toBeGreaterThan(0);
      expect(history.analytics.totalExamsTaken).toBeDefined();
      expect(history.analytics.streakDays).toBeDefined();
    });
  });

  describe("6. Curriculum Referential Integrity & Archival", () => {
    it("should block deleting subject when questions or chapters exist, requiring archival instead", async () => {
      // Trying to delete testSubjectId directly must be blocked because questions/chapters exist
      await expect(CurriculumService.deleteSubject(testSubjectId)).rejects.toThrow(
        /Cannot delete subject:.*(question|chapter)/
      );

      // Archival should succeed smoothly
      const archived = await CurriculumService.updateSubject(testSubjectId, { isActive: false });
      expect(archived.isActive).toBe(false);

      // Restoration should succeed smoothly
      const restored = await CurriculumService.updateSubject(testSubjectId, { isActive: true });
      expect(restored.isActive).toBe(true);
    });
  });

  describe("7. Password Reset Token Verification & Redemption", () => {
    it("should verify valid token and redeem password successfully with single-use enforcement", async () => {
      // 1. Generate reset link
      const reset = await AdminUserService.triggerPasswordReset(testStudentId, superAdminId);
      expect(reset.resetToken).toBeDefined();

      // 2. Token verification should pass
      const verifyRes = await AdminUserService.verifyPasswordResetToken(testStudentEmail, reset.resetToken);
      expect(verifyRes.valid).toBe(true);
      expect(verifyRes.userId).toBe(testStudentId);

      // 3. Reject invalid/tampered token
      const invalidVerify = await AdminUserService.verifyPasswordResetToken(testStudentEmail, "tampered_token_12345");
      expect(invalidVerify.valid).toBe(false);

      // 4. Reject expired token (simulating expired timestamp in DB)
      const pastExpiry = Date.now() - 10000;
      await prisma.user.update({
        where: { id: testStudentId },
        data: { verificationToken: `reset_expiredtoken123_${pastExpiry}` },
      });
      const expiredVerify = await AdminUserService.verifyPasswordResetToken(testStudentEmail, "expiredtoken123");
      expect(expiredVerify.valid).toBe(false);
      expect(expiredVerify.message).toContain("expired");

      // 5. Restore valid token for redemption test
      const validExpiry = Date.now() + 3600000;
      await prisma.user.update({
        where: { id: testStudentId },
        data: { verificationToken: `reset_${reset.resetToken}_${validExpiry}` },
      });

      // 6. Redeem token and change password
      const newPassword = "BrandNewPassword@2026!";
      const resetResult = await AdminUserService.resetPasswordWithToken(
        testStudentEmail,
        reset.resetToken,
        newPassword
      );
      expect(resetResult.success).toBe(true);

      // 7. Verify single-use enforcement: verificationToken must be null
      const updatedUser = await prisma.user.findUnique({
        where: { id: testStudentId },
        select: { passwordHash: true, verificationToken: true },
      });
      expect(updatedUser?.verificationToken).toBeNull();

      // 8. Re-attempting with same token must fail
      const secondAttempt = await AdminUserService.verifyPasswordResetToken(testStudentEmail, reset.resetToken);
      expect(secondAttempt.valid).toBe(false);

      // 9. Verify new password matches hash
      const isNewMatch = await verifyPassword(newPassword, updatedUser!.passwordHash);
      expect(isNewMatch).toBe(true);
    });

    it("should handle self-service password reset request with generic response", async () => {
      const res = await AdminUserService.requestSelfPasswordReset(testStudentEmail);
      expect(res.success).toBe(true);
      expect(res.message).toContain("password reset instructions");

      // Non-existent email should also return generic success to prevent user enumeration
      const nonExistent = await AdminUserService.requestSelfPasswordReset("unknown_user_never_existed@edubd.ac");
      expect(nonExistent.success).toBe(true);
      expect(nonExistent.message).toContain("password reset instructions");
    });
  });
});

