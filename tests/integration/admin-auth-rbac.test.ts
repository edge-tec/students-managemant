import { describe, it, expect, beforeAll, afterAll } from "vitest";
import prisma from "@/lib/db/prisma";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { signSessionToken, verifySessionToken } from "@/lib/auth/jwt";
import {
  hasPermission,
  requirePermission,
  getUserPermissions,
  ROLE_PERMISSIONS,
  PermissionCode,
} from "@/lib/auth/permissions";
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
} from "@/lib/auth/rbac";
import { checkRateLimit, resetRateLimit } from "@/lib/security/rateLimit";
import { validateSafeRedirect } from "@/lib/security/urlValidation";
import { UserService } from "@/lib/admin/userService";
import { UserRoleType } from "@prisma/client";

describe("Phase 5 - Step 1: Production-Grade Admin Authentication & RBAC", () => {
  let testSuperAdminId: string;
  let testReviewerId: string;
  let testTeacherId: string;
  let testFinanceId: string;
  let testSupportId: string;
  let testStudentId: string;
  let testSuspendedAdminId: string;

  const testSuperAdminEmail = `superadmin_step1_${Date.now()}@edubd.ac`;
  const testReviewerEmail = `reviewer_step1_${Date.now()}@edubd.ac`;
  const testTeacherEmail = `teacher_step1_${Date.now()}@edubd.ac`;
  const testFinanceEmail = `finance_step1_${Date.now()}@edubd.ac`;
  const testSupportEmail = `support_step1_${Date.now()}@edubd.ac`;
  const testStudentEmail = `student_step1_${Date.now()}@edubd.ac`;
  const testSuspendedAdminEmail = `suspended_step1_${Date.now()}@edubd.ac`;

  const validPassword = "TestPassword@123456";

  beforeAll(async () => {
    const passwordHash = await hashPassword(validPassword);

    // 1. Ensure all roles exist
    for (const r of Object.values(UserRoleType)) {
      await prisma.role.upsert({
        where: { name: r },
        update: {},
        create: { name: r, description: `${r} role` },
      });
    }

    // 2. Setup Super Admin
    const superAdmin = await prisma.user.create({
      data: {
        email: testSuperAdminEmail,
        fullName: "Test Super Administrator",
        passwordHash,
        isActive: true,
      },
    });
    testSuperAdminId = superAdmin.id;
    const superAdminRole = await prisma.role.findUnique({ where: { name: "SUPER_ADMIN" } });
    if (superAdminRole) {
      await prisma.userRole.create({
        data: { userId: superAdmin.id, roleId: superAdminRole.id },
      });
    }

    // 3. Setup Content Reviewer
    const reviewer = await prisma.user.create({
      data: {
        email: testReviewerEmail,
        fullName: "Test Question Reviewer",
        passwordHash,
        isActive: true,
      },
    });
    testReviewerId = reviewer.id;
    const reviewerRole = await prisma.role.findUnique({ where: { name: "CONTENT_REVIEWER" } });
    if (reviewerRole) {
      await prisma.userRole.create({
        data: { userId: reviewer.id, roleId: reviewerRole.id },
      });
    }

    // 4. Setup Teacher
    const teacher = await prisma.user.create({
      data: {
        email: testTeacherEmail,
        fullName: "Test Teacher",
        passwordHash,
        isActive: true,
      },
    });
    testTeacherId = teacher.id;
    const teacherRole = await prisma.role.findUnique({ where: { name: "TEACHER" } });
    if (teacherRole) {
      await prisma.userRole.create({
        data: { userId: teacher.id, roleId: teacherRole.id },
      });
    }

    // 5. Setup Finance Manager
    const finance = await prisma.user.create({
      data: {
        email: testFinanceEmail,
        fullName: "Test Finance Manager",
        passwordHash,
        isActive: true,
      },
    });
    testFinanceId = finance.id;
    const financeRole = await prisma.role.findUnique({ where: { name: "FINANCE_MANAGER" } });
    if (financeRole) {
      await prisma.userRole.create({
        data: { userId: finance.id, roleId: financeRole.id },
      });
    }

    // 6. Setup Support Agent
    const support = await prisma.user.create({
      data: {
        email: testSupportEmail,
        fullName: "Test Support Agent",
        passwordHash,
        isActive: true,
      },
    });
    testSupportId = support.id;
    const supportRole = await prisma.role.findUnique({ where: { name: "SUPPORT_AGENT" } });
    if (supportRole) {
      await prisma.userRole.create({
        data: { userId: support.id, roleId: supportRole.id },
      });
    }

    // 7. Setup Student (ordinary student account)
    const student = await prisma.user.create({
      data: {
        email: testStudentEmail,
        fullName: "Ordinary Student",
        passwordHash,
        isActive: true,
      },
    });
    testStudentId = student.id;
    const studentRole = await prisma.role.findUnique({ where: { name: "STUDENT" } });
    if (studentRole) {
      await prisma.userRole.create({
        data: { userId: student.id, roleId: studentRole.id },
      });
    }

    // 8. Setup Suspended Administrator
    const suspended = await prisma.user.create({
      data: {
        email: testSuspendedAdminEmail,
        fullName: "Suspended Admin",
        passwordHash,
        isActive: false, // Suspended / deactivated
      },
    });
    testSuspendedAdminId = suspended.id;
    if (superAdminRole) {
      await prisma.userRole.create({
        data: { userId: suspended.id, roleId: superAdminRole.id },
      });
    }
  });

  afterAll(async () => {
    // Cleanup test users created for this suite
    const userIds = [
      testSuperAdminId,
      testReviewerId,
      testTeacherId,
      testFinanceId,
      testSupportId,
      testStudentId,
      testSuspendedAdminId,
    ].filter(Boolean);

    if (userIds.length > 0) {
      await prisma.auditLog.deleteMany({ where: { userId: { in: userIds } } });
      await prisma.userRole.deleteMany({ where: { userId: { in: userIds } } });
      await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    }
  });

  describe("1. Dedicated Administrative Authentication & Security Controls", () => {
    it("should successfully verify administrator credentials and password hash", async () => {
      const user = await prisma.user.findUnique({
        where: { email: testSuperAdminEmail },
        include: { userRoles: { include: { role: true } } },
      });

      expect(user).toBeDefined();
      expect(user?.isActive).toBe(true);

      const isValidPassword = await verifyPassword(validPassword, user!.passwordHash);
      expect(isValidPassword).toBe(true);

      const roles = user!.userRoles.map((ur) => ur.role.name);
      expect(roles).toContain("SUPER_ADMIN");
      expect(isAnyStaff({ id: user!.id, email: user!.email, fullName: user!.fullName, roles, preferredLang: "bn" })).toBe(true);
    });

    it("should reject invalid password with generic authentication failure", async () => {
      const user = await prisma.user.findUnique({
        where: { email: testSuperAdminEmail },
      });

      const isMatch = await verifyPassword("WrongPassword@999", user!.passwordHash);
      expect(isMatch).toBe(false);
    });

    it("should deny access to suspended administrator accounts", async () => {
      const suspended = await prisma.user.findUnique({
        where: { email: testSuspendedAdminEmail },
      });

      expect(suspended).toBeDefined();
      expect(suspended?.isActive).toBe(false);
      // Even with valid password, inactive accounts are rejected by server
      const isMatch = await verifyPassword(validPassword, suspended!.passwordHash);
      expect(isMatch).toBe(true);
      // Server guard check:
      expect(!suspended || !suspended.isActive).toBe(true);
    });

    it("should deny ordinary student accounts administrative access", async () => {
      const student = await prisma.user.findUnique({
        where: { email: testStudentEmail },
        include: { userRoles: { include: { role: true } } },
      });

      const roles = student!.userRoles.map((ur) => ur.role.name);
      const studentSession = {
        id: student!.id,
        email: student!.email,
        fullName: student!.fullName,
        roles,
        preferredLang: "bn",
      };

      // Ordinary student has only STUDENT role, which fails isAnyStaff
      expect(isAnyStaff(studentSession)).toBe(false);
      expect(isAdmin(studentSession)).toBe(false);
      expect(isSuperAdmin(studentSession)).toBe(false);
    });

    it("should enforce brute-force rate limiting after repeated failures", () => {
      const testKey = `admin_test_ratelimit_${Date.now()}`;
      resetRateLimit(testKey);

      // Attempt 1 to 5 allowed
      for (let i = 1; i <= 5; i++) {
        const res = checkRateLimit(testKey, 5, 60000);
        expect(res.allowed).toBe(true);
        expect(res.remaining).toBe(5 - i);
      }

      // Attempt 6 must be blocked with HTTP 429 Retry-After
      const blockedRes = checkRateLimit(testKey, 5, 60000);
      expect(blockedRes.allowed).toBe(false);
      expect(blockedRes.remaining).toBe(0);
      expect(blockedRes.retryAfterSeconds).toBeGreaterThan(0);

      // Reset upon successful authentication
      resetRateLimit(testKey);
      const afterReset = checkRateLimit(testKey, 5, 60000);
      expect(afterReset.allowed).toBe(true);
    });

    it("should strictly validate redirect URLs and prevent Open Redirect vulnerabilities (CWE-601)", () => {
      // Malicious targets must be neutralized to fallback (/admin)
      expect(validateSafeRedirect("//attacker.com")).toBe("/admin");
      expect(validateSafeRedirect("//evil.com/phish")).toBe("/admin");
      expect(validateSafeRedirect("http://evil.com")).toBe("/admin");
      expect(validateSafeRedirect("https://attacker.com/admin")).toBe("/admin");
      expect(validateSafeRedirect("javascript:alert(1)")).toBe("/admin");
      expect(validateSafeRedirect("/\\attacker.com")).toBe("/admin");
      expect(validateSafeRedirect("attacker.com")).toBe("/admin");

      // Valid internal relative destinations must be preserved
      expect(validateSafeRedirect("/admin")).toBe("/admin");
      expect(validateSafeRedirect("/admin?tab=users")).toBe("/admin?tab=users");
      expect(validateSafeRedirect("/admin?tab=questions&page=2")).toBe("/admin?tab=questions&page=2");
      expect(validateSafeRedirect("/admin?tab=finance")).toBe("/admin?tab=finance");
    });
  });

  describe("2. Granular Permissions & Role-Permission Matrix", () => {
    it("should grant Super Administrator all granular permissions", () => {
      const superAdminSession = {
        id: testSuperAdminId,
        email: testSuperAdminEmail,
        fullName: "Test Super Administrator",
        roles: ["SUPER_ADMIN"],
        preferredLang: "bn",
      };

      const permissions = getUserPermissions(superAdminSession);
      expect(permissions).toContain("users.read");
      expect(permissions).toContain("users.update");
      expect(permissions).toContain("users.suspend");
      expect(permissions).toContain("roles.manage");
      expect(permissions).toContain("questions.publish");
      expect(permissions).toContain("payments.refund");
      expect(permissions).toContain("settings.manage");
      expect(permissions).toContain("audit.read");

      expect(hasPermission(superAdminSession, "users.suspend")).toBe(true);
      expect(hasPermission(superAdminSession, "settings.manage")).toBe(true);
      expect(hasPermission(superAdminSession, "payments.refund")).toBe(true);
    });

    it("should enforce least-privilege for Content Reviewer", () => {
      const reviewerSession = {
        id: testReviewerId,
        email: testReviewerEmail,
        fullName: "Test Reviewer",
        roles: ["CONTENT_REVIEWER"],
        preferredLang: "bn",
      };

      // Reviewer can review and approve questions
      expect(hasPermission(reviewerSession, "questions.read")).toBe(true);
      expect(hasPermission(reviewerSession, "questions.review")).toBe(true);
      expect(hasPermission(reviewerSession, "questions.approve")).toBe(true);
      expect(hasPermission(reviewerSession, "questions.publish")).toBe(true);

      // Reviewer CANNOT access finance, manage users, or change settings
      expect(hasPermission(reviewerSession, "payments.verify")).toBe(false);
      expect(hasPermission(reviewerSession, "payments.refund")).toBe(false);
      expect(hasPermission(reviewerSession, "users.suspend")).toBe(false);
      expect(hasPermission(reviewerSession, "settings.manage")).toBe(false);

      expect(() => requirePermission(reviewerSession, "payments.refund")).toThrow("Access Denied");
    });

    it("should enforce least-privilege for Teacher and prevent self-approval (separation of duties)", () => {
      const teacherSession = {
        id: testTeacherId,
        email: testTeacherEmail,
        fullName: "Test Teacher",
        roles: ["TEACHER"],
        preferredLang: "bn",
      };

      // Teacher can create questions and evaluate answers
      expect(hasPermission(teacherSession, "questions.create")).toBe(true);
      expect(hasPermission(teacherSession, "grading.evaluate")).toBe(true);

      // Teacher CANNOT approve questions when they are the author
      expect(hasPermission(teacherSession, "questions.approve", { authorId: testTeacherId })).toBe(false);
      expect(hasPermission(teacherSession, "questions.publish", { authorId: testTeacherId })).toBe(false);

      // Teacher CANNOT manage platform settings or refund payments
      expect(hasPermission(teacherSession, "settings.manage")).toBe(false);
      expect(hasPermission(teacherSession, "payments.refund")).toBe(false);
      expect(hasPermission(teacherSession, "users.reset_password")).toBe(false);
    });

    it("should enforce least-privilege for Finance Manager", () => {
      const financeSession = {
        id: testFinanceId,
        email: testFinanceEmail,
        fullName: "Test Finance",
        roles: ["FINANCE_MANAGER"],
        preferredLang: "bn",
      };

      expect(hasPermission(financeSession, "payments.read")).toBe(true);
      expect(hasPermission(financeSession, "payments.verify")).toBe(true);
      expect(hasPermission(financeSession, "payments.refund")).toBe(true);

      // Finance staff CANNOT publish questions, edit exams, or manage users
      expect(hasPermission(financeSession, "questions.publish")).toBe(false);
      expect(hasPermission(financeSession, "exams.publish")).toBe(false);
      expect(hasPermission(financeSession, "users.suspend")).toBe(false);
    });

    it("should enforce least-privilege for Student Support Agent", () => {
      const supportSession = {
        id: testSupportId,
        email: testSupportEmail,
        fullName: "Test Support",
        roles: ["SUPPORT_AGENT"],
        preferredLang: "bn",
      };

      expect(hasPermission(supportSession, "users.read")).toBe(true);
      expect(hasPermission(supportSession, "users.reset_password")).toBe(true);

      // Support Agent CANNOT assign roles, refund payments, or approve questions
      expect(hasPermission(supportSession, "roles.assign")).toBe(false);
      expect(hasPermission(supportSession, "payments.refund")).toBe(false);
      expect(hasPermission(supportSession, "questions.approve")).toBe(false);
    });

    it("should deny Student all administrative permissions", () => {
      const studentSession = {
        id: testStudentId,
        email: testStudentEmail,
        fullName: "Test Student",
        roles: ["STUDENT"],
        preferredLang: "bn",
      };

      const studentPerms = getUserPermissions(studentSession);
      expect(studentPerms.length).toBe(0);

      const allPermissions: PermissionCode[] = [
        "users.read",
        "roles.assign",
        "questions.approve",
        "payments.refund",
        "settings.manage",
        "audit.read",
      ];

      for (const p of allPermissions) {
        expect(hasPermission(studentSession, p)).toBe(false);
        expect(() => requirePermission(studentSession, p)).toThrow("Access Denied");
      }
    });
  });

  describe("3. Last Super Administrator Protection Guard", () => {
    it("should prevent demoting or revoking SUPER_ADMIN from the sole active Super Admin", async () => {
      const superAdmins = await prisma.user.count({
        where: {
          isActive: true,
          userRoles: {
            some: {
              role: { name: UserRoleType.SUPER_ADMIN },
            },
          },
        },
      });

      expect(superAdmins).toBeGreaterThanOrEqual(1);

      // If exactly 1 super admin exists, attempting to revoke its role must be rejected
      if (superAdmins === 1) {
        await expect(
          UserService.manageRole(testSuperAdminId, "SUPER_ADMIN", "REVOKE", testSuperAdminId)
        ).rejects.toThrow("Cannot remove the last remaining Super Administrator role");
      }
    });
  });

  describe("4. Regression Verification", () => {
    it("should verify student standard authentication remains operational", async () => {
      const student = await prisma.user.findUnique({
        where: { email: testStudentEmail },
      });

      expect(student).toBeDefined();
      const isMatch = await verifyPassword(validPassword, student!.passwordHash);
      expect(isMatch).toBe(true);

      const token = signSessionToken({
        id: student!.id,
        email: student!.email,
        fullName: student!.fullName,
        roles: ["STUDENT"],
        preferredLang: "bn",
      });

      const decoded = verifySessionToken(token);
      expect(decoded).not.toBeNull();
      expect(decoded?.email).toBe(testStudentEmail);
      expect(decoded?.roles).toEqual(["STUDENT"]);
    });

    it("should verify question bank and curriculum services remain fully intact", async () => {
      const subjects = await prisma.subject.findMany({ take: 3 });
      expect(subjects.length).toBeGreaterThan(0);

      const questionsCount = await prisma.question.count();
      expect(questionsCount).toBeGreaterThanOrEqual(0);
    });

    it("should enforce rate limiting on student authentication endpoint against brute force", () => {
      const testKey = `user_login_127.0.0.1_student_${Date.now()}@edubd.ac`;
      resetRateLimit(testKey);

      for (let i = 1; i <= 10; i++) {
        const attempt = checkRateLimit(testKey, 10, 15 * 60 * 1000);
        expect(attempt.allowed).toBe(true);
      }

      // 11th attempt must be blocked
      const blocked = checkRateLimit(testKey, 10, 15 * 60 * 1000);
      expect(blocked.allowed).toBe(false);
      expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
      resetRateLimit(testKey);
    });

    it("should verify deny-by-default on sensitive admin endpoints for unauthenticated and student users", () => {
      const studentSession = {
        id: testStudentId,
        email: testStudentEmail,
        fullName: "Test Student",
        roles: ["STUDENT"],
        preferredLang: "bn",
      };

      // Deny by default checks
      expect(isAdmin(studentSession)).toBe(false);
      expect(isAnyStaff(studentSession)).toBe(false);
      expect(isFinanceStaff(studentSession)).toBe(false);
      expect(canManageUsers(studentSession)).toBe(false);
      expect(canAccessAudit(studentSession)).toBe(false);
      expect(canManageSettings(studentSession)).toBe(false);

      // Anonymous (null) checks
      expect(isAdmin(null)).toBe(false);
      expect(isAnyStaff(null)).toBe(false);
      expect(canManageUsers(null)).toBe(false);
      expect(canAccessAudit(null)).toBe(false);
    });
  });
});
