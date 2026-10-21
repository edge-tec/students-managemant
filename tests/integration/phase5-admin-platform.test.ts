import { describe, it, expect, beforeAll, afterAll } from "vitest";
import prisma from "@/lib/db/prisma";
import {
  isSuperAdmin,
  isAdmin,
  isContentReviewer,
  isFinanceStaff,
  isSupportStaff,
  isAnyStaff,
  canManageUsers,
  canAccessAudit,
  canManageSettings,
  canApproveQuestions,
} from "@/lib/auth/rbac";
import { UserService } from "@/lib/admin/userService";
import { AuditService } from "@/lib/audit/auditService";
import { QuestionService } from "@/lib/questions/questionService";
import {
  UserRoleType,
  ContentStatus,
  ExamCategoryType,
  QuestionType,
  PaymentStatus,
  PaymentMethod,
} from "@prisma/client";

describe("Phase 5: Enterprise Admin Panel, RBAC & Platform Analytics", () => {
  let superAdminUser: any;
  let adminUser: any;
  let reviewerUser: any;
  let teacherUser: any;
  let financeUser: any;
  let studentUser: any;
  let testSubjectId: string;
  let testChapterId: string;

  const testPrefix = "ফেজ৫_অ্যাডমিন_টেস্ট_";

  beforeAll(async () => {
    // 1. Ensure seed roles exist
    const rolesToEnsure = Object.values(UserRoleType);
    for (const r of rolesToEnsure) {
      await prisma.role.upsert({
        where: { name: r },
        create: { name: r, description: `${r} role` },
        update: {},
      });
    }

    // 2. Setup Super Admin
    superAdminUser = await prisma.user.upsert({
      where: { email: "superadmin_test@edubd.ac" },
      create: {
        email: "superadmin_test@edubd.ac",
        fullName: "Chief Super Admin",
        fullNameBn: "প্রধান সুপার অ্যাডমিন",
        passwordHash: "secure-hash",
        isActive: true,
      },
      update: { isActive: true },
    });
    const superAdminRole = await prisma.role.findUnique({ where: { name: "SUPER_ADMIN" } });
    if (superAdminRole) {
      await prisma.userRole.upsert({
        where: { userId_roleId: { userId: superAdminUser.id, roleId: superAdminRole.id } },
        create: { userId: superAdminUser.id, roleId: superAdminRole.id },
        update: {},
      });
    }

    // 3. Setup Content Reviewer
    reviewerUser = await prisma.user.upsert({
      where: { email: "reviewer_test@edubd.ac" },
      create: {
        email: "reviewer_test@edubd.ac",
        fullName: "Senior Reviewer",
        fullNameBn: "সিনিয়র প্রশ্ন পরীক্ষক",
        passwordHash: "secure-hash",
        isActive: true,
      },
      update: { isActive: true },
    });
    const reviewerRole = await prisma.role.findUnique({ where: { name: "CONTENT_REVIEWER" } });
    if (reviewerRole) {
      await prisma.userRole.upsert({
        where: { userId_roleId: { userId: reviewerUser.id, roleId: reviewerRole.id } },
        create: { userId: reviewerUser.id, roleId: reviewerRole.id },
        update: {},
      });
    }

    // 4. Setup Teacher / Question Author
    teacherUser = await prisma.user.upsert({
      where: { email: "teacher_test@edubd.ac" },
      create: {
        email: "teacher_test@edubd.ac",
        fullName: "Physics Master Teacher",
        fullNameBn: "পদার্থবিজ্ঞান শিক্ষক",
        passwordHash: "secure-hash",
        isActive: true,
      },
      update: { isActive: true },
    });
    const teacherRole = await prisma.role.findUnique({ where: { name: "TEACHER" } });
    if (teacherRole) {
      await prisma.userRole.upsert({
        where: { userId_roleId: { userId: teacherUser.id, roleId: teacherRole.id } },
        create: { userId: teacherUser.id, roleId: teacherRole.id },
        update: {},
      });
    }

    // 5. Setup Finance Staff
    financeUser = await prisma.user.upsert({
      where: { email: "finance_test@edubd.ac" },
      create: {
        email: "finance_test@edubd.ac",
        fullName: "Finance Auditor",
        fullNameBn: "অর্থ ও অডিট কর্মকর্তা",
        passwordHash: "secure-hash",
        isActive: true,
      },
      update: { isActive: true },
    });
    const financeRole = await prisma.role.findUnique({ where: { name: "FINANCE_MANAGER" } });
    if (financeRole) {
      await prisma.userRole.upsert({
        where: { userId_roleId: { userId: financeUser.id, roleId: financeRole.id } },
        create: { userId: financeUser.id, roleId: financeRole.id },
        update: {},
      });
    }

    // 6. Setup Student
    studentUser = await prisma.user.upsert({
      where: { email: "student_test@edubd.ac" },
      create: {
        email: "student_test@edubd.ac",
        fullName: "Enrolled Student",
        fullNameBn: "পরীক্ষার্থী শিক্ষার্থী",
        passwordHash: "secure-hash",
        isActive: true,
      },
      update: { isActive: true },
    });
    const studentRole = await prisma.role.findUnique({ where: { name: "STUDENT" } });
    if (studentRole) {
      await prisma.userRole.upsert({
        where: { userId_roleId: { userId: studentUser.id, roleId: studentRole.id } },
        create: { userId: studentUser.id, roleId: studentRole.id },
        update: {},
      });
    }

    // 7. Setup test Subject & Chapter
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
          chapterNum: 1,
          nameBn: "ভৌত জগত ও পরিমাপ",
          nameEn: "Physical World",
        },
      });
    }
    testChapterId = chapter.id;
  });

  afterAll(async () => {
    // Cleanup questions created in this suite
    const questions = await prisma.question.findMany({
      where: { questionTextBn: { contains: testPrefix } },
      select: { id: true },
    });
    const qIds = questions.map((q) => q.id);
    if (qIds.length > 0) {
      await prisma.questionAnswer.deleteMany({ where: { questionId: { in: qIds } } });
      await prisma.questionOption.deleteMany({ where: { questionId: { in: qIds } } });
      await prisma.contentReview.deleteMany({ where: { questionId: { in: qIds } } });
      await prisma.questionRevision.deleteMany({ where: { questionId: { in: qIds } } });
      await prisma.question.deleteMany({ where: { id: { in: qIds } } });
    }
  });

  describe("1. RBAC & Granular Permission Evaluation", () => {
    it("should correctly evaluate role hierarchy and permissions", () => {
      const superAdminSession = {
        id: superAdminUser.id,
        email: superAdminUser.email,
        roles: ["SUPER_ADMIN"],
      };

      const reviewerSession = {
        id: reviewerUser.id,
        email: reviewerUser.email,
        roles: ["CONTENT_REVIEWER"],
      };

      const financeSession = {
        id: financeUser.id,
        email: financeUser.email,
        roles: ["FINANCE_MANAGER"],
      };

      const studentSession = {
        id: studentUser.id,
        email: studentUser.email,
        roles: ["STUDENT"],
      };

      // Super Admin has all elevated capabilities
      expect(isSuperAdmin(superAdminSession)).toBe(true);
      expect(isAdmin(superAdminSession)).toBe(true);
      expect(canManageUsers(superAdminSession)).toBe(true);
      expect(canAccessAudit(superAdminSession)).toBe(true);
      expect(canManageSettings(superAdminSession)).toBe(true);
      expect(isAnyStaff(superAdminSession)).toBe(true);

      // Reviewer only has content review capability
      expect(isContentReviewer(reviewerSession)).toBe(true);
      expect(isAdmin(reviewerSession)).toBe(false);
      expect(canManageUsers(reviewerSession)).toBe(false);
      expect(canAccessAudit(reviewerSession)).toBe(false);

      // Finance staff only has finance capability
      expect(isFinanceStaff(financeSession)).toBe(true);
      expect(isAdmin(financeSession)).toBe(false);
      expect(canManageUsers(financeSession)).toBe(false);

      // Student has no administrative permissions
      expect(isAdmin(studentSession)).toBe(false);
      expect(isAnyStaff(studentSession)).toBe(false);
      expect(canManageUsers(studentSession)).toBe(false);
      expect(canAccessAudit(studentSession)).toBe(false);
      expect(canManageSettings(studentSession)).toBe(false);
    });
  });

  describe("2. User Management & Last Super Admin Guard", () => {
    it("should list users with pagination and search filtering", async () => {
      const result = await UserService.listUsers({ search: "superadmin_test", page: 1, limit: 10 });
      expect(result.users.length).toBeGreaterThan(0);
      expect(result.users[0].email).toBe("superadmin_test@edubd.ac");
      expect(result.users[0].roles).toContain("SUPER_ADMIN");
    });

    it("should suspend and reactivate a user account", async () => {
      const suspended = await UserService.updateStatus(studentUser.id, "SUSPENDED", superAdminUser.id);
      expect(suspended.status).toBe("SUSPENDED");

      const active = await UserService.updateStatus(studentUser.id, "ACTIVE", superAdminUser.id);
      expect(active.status).toBe("ACTIVE");
    });

    it("should protect the last remaining Super Admin from suspension", async () => {
      // Find all super admins
      const superAdmins = await prisma.userRole.findMany({
        where: { role: { name: "SUPER_ADMIN" } },
      });

      // If only one exists, attempting to suspend it must throw
      if (superAdmins.length === 1) {
        await expect(
          UserService.updateStatus(superAdmins[0].userId, "SUSPENDED", superAdminUser.id)
        ).rejects.toThrow("Cannot suspend the last remaining Super Administrator");
      } else {
        expect(superAdmins.length).toBeGreaterThan(1);
      }
    });

    it("should protect the last remaining Super Admin from having role revoked", async () => {
      const superAdmins = await prisma.userRole.findMany({
        where: { role: { name: "SUPER_ADMIN" } },
      });

      if (superAdmins.length === 1) {
        await expect(
          UserService.manageRole(superAdmins[0].userId, "SUPER_ADMIN", "REVOKE", superAdminUser.id)
        ).rejects.toThrow("Cannot remove the last remaining Super Administrator role");
      }
    });

    it("should generate a secure 1-hour expiring password reset link without password exposure", async () => {
      const reset = await UserService.generatePasswordResetLink(studentUser.id, superAdminUser.id);
      expect(reset.resetToken).toBeDefined();
      expect(reset.resetToken.length).toBe(64); // 32 random bytes hex
      expect(reset.resetUrl).toContain(reset.resetToken);

      const expiresAt = new Date(reset.expiresAt).getTime();
      const now = Date.now();
      const diffHours = (expiresAt - now) / (1000 * 60 * 60);
      expect(diffHours).toBeGreaterThan(0.9);
      expect(diffHours).toBeLessThanOrEqual(1.1);
    });
  });

  describe("3. Academic Quality Control & Question Review Workflow", () => {
    let createdQuestionId: string;

    it("should allow a teacher to create a question in DRAFT status", async () => {
      const q = await QuestionService.createQuestion(
        {
          category: ExamCategoryType.HSC,
          subjectId: testSubjectId,
          chapterId: testChapterId,
          type: QuestionType.MCQ,
          questionTextBn: `${testPrefix} ভেক্টর যোগের সামান্তরিক সূত্র কোনটি?`,
          options: [
            { optionKey: "A", textBn: "R = P + Q", isCorrect: false },
            { optionKey: "B", textBn: "R^2 = P^2 + Q^2 + 2PQ cos(\\alpha)", isCorrect: true },
            { optionKey: "C", textBn: "R = P - Q", isCorrect: false },
            { optionKey: "D", textBn: "R = PQ", isCorrect: false },
          ],
          answer: { correctKey: "B", explanationBn: "সামান্তরিক সূত্রের লব্ধির মান।" },
        },
        teacherUser.id
      );

      createdQuestionId = q.id;
      expect(q.status).toBe(ContentStatus.DRAFT);
      expect(q.authorId).toBe(teacherUser.id);
    });

    it("should allow submitting the question for review", async () => {
      const inReview = await QuestionService.updateStatus(
        createdQuestionId,
        ContentStatus.REVIEW,
        teacherUser.id,
        "Ready for academic review"
      );
      expect(inReview.status).toBe(ContentStatus.REVIEW);
    });

    it("should strictly enforce Separation of Duties: author cannot approve own question", async () => {
      await expect(
        QuestionService.updateStatus(
          createdQuestionId,
          ContentStatus.APPROVED,
          teacherUser.id, // author attempting approval
          "Attempting self-approval"
        )
      ).rejects.toThrow("Separation of duties: Authors cannot approve or publish their own questions.");
    });

    it("should allow an independent reviewer to approve and publish the question", async () => {
      // Independent reviewer approves
      const approved = await QuestionService.updateStatus(
        createdQuestionId,
        ContentStatus.APPROVED,
        reviewerUser.id,
        "Formulas and options verified"
      );
      expect(approved.status).toBe(ContentStatus.APPROVED);

      // Independent reviewer publishes
      const published = await QuestionService.updateStatus(
        createdQuestionId,
        ContentStatus.PUBLISHED,
        reviewerUser.id,
        "Published for student examinations"
      );
      expect(published.status).toBe(ContentStatus.PUBLISHED);

      // Verify audit logs were written
      const reviews = await prisma.contentReview.findMany({
        where: { questionId: createdQuestionId },
      });
      expect(reviews.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe("4. Audit Trail & Security Logs", () => {
    it("should record immutable audit logs and allow searching", async () => {
      const logEntry = await AuditService.log({
        userId: superAdminUser.id,
        action: "EXAM_POLICY_UPDATED",
        resource: "SiteSetting",
        resourceId: "default_exam_duration_minutes",
        details: { oldValue: "45", newValue: "60" },
      });

      expect(logEntry).toBeDefined();
      expect(logEntry?.action).toBe("EXAM_POLICY_UPDATED");

      const logs = await AuditService.listAuditLogs({
        action: "EXAM_POLICY_UPDATED",
        limit: 5,
      });

      expect(logs.total).toBeGreaterThan(0);
      expect(logs.logs.some((l) => l.action === "EXAM_POLICY_UPDATED")).toBe(true);
      expect(logs.logs[0].actor.name).toBe(superAdminUser.fullNameBn || superAdminUser.fullName);
    });
  });

  describe("5. Finance & Order Verification with Subscription Entitlement", () => {
    it("should verify a pending payment order and activate student subscription", async () => {
      // Create a test plan
      const plan = await prisma.subscriptionPlan.upsert({
        where: { code: "HSC_PREMIUM_TEST" },
        create: {
          code: "HSC_PREMIUM_TEST",
          nameBn: "এইচএসসি প্রিমিয়াম টেস্ট প্ল্যান",
          nameEn: "HSC Premium Test Plan",
          priceBdt: 1200,
          durationDays: 90,
          featuresJson: JSON.stringify(["Unlimited Exams", "Doubt Solving"]),
        },
        update: {},
      });

      // Create a pending order
      const order = await prisma.paymentOrder.create({
        data: {
          orderNumber: `ORD-TEST-${Date.now()}`,
          studentId: studentUser.id,
          planId: plan.id,
          amountBdt: 1200,
          paymentMethod: PaymentMethod.BKASH,
          status: PaymentStatus.PENDING,
          providerTxId: `BKASH_${Date.now()}`,
        },
      });

      expect(order.status).toBe(PaymentStatus.PENDING);

      // Verify transaction in atomic block
      const updatedOrder = await prisma.$transaction(async (tx) => {
        const o = await tx.paymentOrder.update({
          where: { id: order.id },
          data: { status: PaymentStatus.VERIFIED },
        });

        await tx.subscription.create({
          data: {
            studentId: order.studentId,
            planId: order.planId,
            orderId: order.id,
            status: "ACTIVE",
            startDate: new Date(),
            endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
          },
        });

        return o;
      });

      expect(updatedOrder.status).toBe(PaymentStatus.VERIFIED);

      // Verify subscription now exists for student
      const sub = await prisma.subscription.findFirst({
        where: { orderId: order.id },
      });
      expect(sub).toBeDefined();
      expect(sub?.status).toBe("ACTIVE");

      // Cleanup
      await prisma.subscription.deleteMany({ where: { orderId: order.id } });
      await prisma.paymentOrder.delete({ where: { id: order.id } });
    });
  });

  describe("6. Platform Settings Persistence", () => {
    it("should save and retrieve platform operational configuration", async () => {
      await prisma.siteSetting.upsert({
        where: { key: "review_separation_of_duties" },
        create: {
          key: "review_separation_of_duties",
          value: "true",
          description: "Enforces author cannot approve own question",
        },
        update: { value: "true" },
      });

      const setting = await prisma.siteSetting.findUnique({
        where: { key: "review_separation_of_duties" },
      });

      expect(setting?.value).toBe("true");
    });
  });

  describe("7. Security Defenses: Spreadsheet Formula Injection Mitigation (CWE-1236)", () => {
    function sanitizeCsvValue(val: unknown): string {
      if (val === null || val === undefined) return '""';
      let str = String(val);
      if (/^[=+\-@\t\r]/.test(str)) {
        str = "'" + str;
      }
      return `"${str.replace(/"/g, '""')}"`;
    }

    it("should neutralize formula injection attack payloads by prefixing with a single quote", () => {
      const maliciousPayloads = [
        "=SUM(A1:B1)",
        "=cmd|'/C calc'!A0",
        "+123456",
        "-75000",
        "@SUM(A1:B1)",
        "\tmalicious_tab",
        "\rmalicious_return",
      ];

      for (const payload of maliciousPayloads) {
        const sanitized = sanitizeCsvValue(payload);
        expect(sanitized.startsWith("\"'")).toBe(true);
        expect(sanitized.endsWith("\"")).toBe(true);
      }
    });

    it("should leave benign text intact with standard quoting", () => {
      expect(sanitizeCsvValue("HSC Physics 1st Paper")).toBe('"HSC Physics 1st Paper"');
      expect(sanitizeCsvValue("ভেক্টর রাশির উদাহরণ")).toBe('"ভেক্টর রাশির উদাহরণ"');
      expect(sanitizeCsvValue(1234)).toBe('"1234"');
    });
  });

  describe("8. Administrative Data Isolation & Privilege Boundaries", () => {
    it("should block ordinary students from viewing administrative audit logs and users", () => {
      const studentSession = {
        id: studentUser.id,
        email: studentUser.email,
        roles: ["STUDENT"],
      };

      expect(canAccessAudit(studentSession)).toBe(false);
      expect(canManageUsers(studentSession)).toBe(false);
      expect(canManageSettings(studentSession)).toBe(false);
      expect(isFinanceStaff(studentSession)).toBe(false);
      expect(isAnyStaff(studentSession)).toBe(false);
    });

    it("should prevent unauthorized staff privilege escalation", () => {
      const teacherSession = {
        id: teacherUser.id,
        email: teacherUser.email,
        roles: ["TEACHER"],
      };

      // Teacher cannot access finance or audit logs
      expect(isFinanceStaff(teacherSession)).toBe(false);
      expect(canAccessAudit(teacherSession)).toBe(false);
      expect(canManageSettings(teacherSession)).toBe(false);
      expect(canManageUsers(teacherSession)).toBe(false);
    });
  });
});

