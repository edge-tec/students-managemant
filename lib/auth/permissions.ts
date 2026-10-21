import { SessionUser } from "./jwt";
import { UserRoleType } from "@prisma/client";

export type PermissionCode =
  // User & Staff Management
  | "users.read"
  | "users.create"
  | "users.update"
  | "users.suspend"
  | "users.restore"
  | "users.reset_password"
  // Role & Privilege Management
  | "roles.read"
  | "roles.assign"
  | "roles.manage"
  // Curriculum & Structure
  | "curriculum.read"
  | "curriculum.manage"
  // Question Bank & Review
  | "questions.read"
  | "questions.create"
  | "questions.update"
  | "questions.review"
  | "questions.approve"
  | "questions.publish"
  | "questions.archive"
  | "questions.import"
  // PDF Imports & AI Question Generation
  | "pdf.read"
  | "pdf.import"
  | "pdf.manage"
  // Examination Engine
  | "exams.read"
  | "exams.create"
  | "exams.update"
  | "exams.publish"
  | "exams.cancel"
  | "exams.schedule"
  // Subjective Grading & Evaluation
  | "grading.read"
  | "grading.evaluate"
  | "grading.regrade"
  // Results
  | "results.read"
  | "results.release"
  // Platform & Learning Analytics
  | "analytics.read"
  | "reports.export"
  // Subscriptions & Finance
  | "payments.read"
  | "payments.verify"
  | "payments.refund"
  // Operational Settings & Policies
  | "settings.read"
  | "settings.manage"
  // Audit Trail & Security Logs
  | "audit.read";

/**
 * Role to Granular Permissions Matrix enforcing least-privilege defaults.
 */
export const ROLE_PERMISSIONS: Record<UserRoleType, readonly PermissionCode[]> = {
  SUPER_ADMIN: [
    "users.read",
    "users.create",
    "users.update",
    "users.suspend",
    "users.restore",
    "users.reset_password",
    "roles.read",
    "roles.assign",
    "roles.manage",
    "curriculum.read",
    "curriculum.manage",
    "questions.read",
    "questions.create",
    "questions.update",
    "questions.review",
    "questions.approve",
    "questions.publish",
    "questions.archive",
    "questions.import",
    "pdf.read",
    "pdf.import",
    "pdf.manage",
    "exams.read",
    "exams.create",
    "exams.update",
    "exams.publish",
    "exams.cancel",
    "exams.schedule",
    "grading.read",
    "grading.evaluate",
    "grading.regrade",
    "results.read",
    "results.release",
    "analytics.read",
    "reports.export",
    "payments.read",
    "payments.verify",
    "payments.refund",
    "settings.read",
    "settings.manage",
    "audit.read",
  ],

  ADMIN: [
    "users.read",
    "users.create",
    "users.update",
    "users.suspend",
    "users.restore",
    "users.reset_password",
    "roles.read",
    "roles.assign",
    "curriculum.read",
    "curriculum.manage",
    "questions.read",
    "questions.create",
    "questions.update",
    "questions.review",
    "questions.approve",
    "questions.publish",
    "questions.archive",
    "questions.import",
    "pdf.read",
    "pdf.import",
    "pdf.manage",
    "exams.read",
    "exams.create",
    "exams.update",
    "exams.publish",
    "exams.cancel",
    "exams.schedule",
    "grading.read",
    "grading.evaluate",
    "grading.regrade",
    "results.read",
    "results.release",
    "analytics.read",
    "reports.export",
    "settings.read",
    "settings.manage",
    "audit.read",
  ],

  CONTENT_MANAGER: [
    "curriculum.read",
    "curriculum.manage",
    "questions.read",
    "questions.create",
    "questions.update",
    "questions.review",
    "questions.approve",
    "questions.publish",
    "questions.archive",
    "questions.import",
    "pdf.read",
    "pdf.import",
    "pdf.manage",
    "exams.read",
    "exams.create",
    "exams.update",
    "exams.publish",
    "analytics.read",
    "reports.export",
  ],

  CONTENT_REVIEWER: [
    "curriculum.read",
    "questions.read",
    "questions.review",
    "questions.approve",
    "questions.publish",
    "pdf.read",
    "analytics.read",
  ],

  TEACHER: [
    "curriculum.read",
    "questions.read",
    "questions.create",
    "questions.update",
    "pdf.read",
    "pdf.import",
    "exams.read",
    "exams.create",
    "exams.update",
    "grading.read",
    "grading.evaluate",
    "results.read",
    "analytics.read",
  ],

  FINANCE_MANAGER: [
    "payments.read",
    "payments.verify",
    "payments.refund",
    "analytics.read",
    "reports.export",
  ],

  SUPPORT_AGENT: [
    "users.read",
    "users.update",
    "users.reset_password",
    "payments.read",
  ],

  STUDENT: [],
};

/**
 * Resolves all unique permissions granted to a user based on their assigned roles.
 */
export function getUserPermissions(user: SessionUser | null): PermissionCode[] {
  if (!user || !user.roles || user.roles.length === 0) return [];
  const permissionsSet = new Set<PermissionCode>();

  for (const role of user.roles) {
    const roleType = role as UserRoleType;
    const perms = ROLE_PERMISSIONS[roleType];
    if (perms) {
      perms.forEach((p) => permissionsSet.add(p));
    }
  }

  return Array.from(permissionsSet);
}

/**
 * Evaluates whether a user holds a specific granular permission,
 * applying contextual policies such as separation of duties.
 */
export function hasPermission(
  user: SessionUser | null,
  permission: PermissionCode,
  context?: { authorId?: string | null }
): boolean {
  if (!user || !user.roles || user.roles.length === 0) return false;

  // Super Admin bypass for general operations, but separation of duties policy applies if authorId matches
  if (user.roles.includes("SUPER_ADMIN")) {
    if (
      (permission === "questions.approve" || permission === "questions.publish") &&
      context?.authorId &&
      user.id === context.authorId
    ) {
      return false; // Even Super Admin must respect separation of duties for their own authored questions
    }
    return true;
  }

  // Academic quality separation of duties check
  if (
    (permission === "questions.approve" || permission === "questions.publish") &&
    context?.authorId &&
    user.id === context.authorId
  ) {
    return false;
  }

  const userPerms = getUserPermissions(user);
  return userPerms.includes(permission);
}

/**
 * Enforces a permission check or throws a descriptive authorization error.
 */
export function requirePermission(
  user: SessionUser | null,
  permission: PermissionCode,
  context?: { authorId?: string | null }
): void {
  if (!user) {
    throw new Error("Authentication required: No active session found.");
  }

  if (!hasPermission(user, permission, context)) {
    throw new Error(`Access Denied: Missing required permission '${permission}'.`);
  }
}
