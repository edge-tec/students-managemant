import { SessionUser } from "./jwt";
import { UserRoleType } from "@prisma/client";

export function hasRole(user: SessionUser | null, role: UserRoleType): boolean {
  if (!user || !user.roles) return false;
  if (user.roles.includes("SUPER_ADMIN")) return true;
  return user.roles.includes(role);
}

export function isSuperAdmin(user: SessionUser | null): boolean {
  if (!user || !user.roles) return false;
  return user.roles.includes("SUPER_ADMIN");
}

export function isAdmin(user: SessionUser | null): boolean {
  return hasRole(user, "ADMIN") || isSuperAdmin(user);
}

export function isTeacher(user: SessionUser | null): boolean {
  return hasRole(user, "TEACHER") || isAdmin(user);
}

export function isContentStaff(user: SessionUser | null): boolean {
  return (
    hasRole(user, "CONTENT_MANAGER") ||
    hasRole(user, "CONTENT_REVIEWER") ||
    isAdmin(user)
  );
}

export function isContentReviewer(user: SessionUser | null): boolean {
  return hasRole(user, "CONTENT_REVIEWER") || hasRole(user, "CONTENT_MANAGER") || isAdmin(user);
}

export function isExamStaff(user: SessionUser | null): boolean {
  return isTeacher(user) || isContentStaff(user);
}

export function isFinanceStaff(user: SessionUser | null): boolean {
  return hasRole(user, "FINANCE_MANAGER") || isAdmin(user);
}

export function isSupportStaff(user: SessionUser | null): boolean {
  return hasRole(user, "SUPPORT_AGENT") || isAdmin(user);
}

export function isAnyStaff(user: SessionUser | null): boolean {
  if (!user || !user.roles || user.roles.length === 0) return false;
  return user.roles.some((r) => r !== "STUDENT");
}

export function canManageUsers(user: SessionUser | null): boolean {
  return isAdmin(user);
}

export function canAccessAudit(user: SessionUser | null): boolean {
  return isAdmin(user);
}

export function canManageSettings(user: SessionUser | null): boolean {
  return isAdmin(user);
}

/**
 * Enforces academic quality control policy:
 * Reviewers/Approvers cannot approve or publish their own questions.
 */
export function canApproveQuestions(user: SessionUser | null, authorId?: string | null): boolean {
  if (!user) return false;
  if (!isContentStaff(user)) return false;
  // Super Admins and Admins possess platform-wide supervisory approval authority
  if (isAdmin(user) || isSuperAdmin(user)) {
    return true;
  }
  // Content authors (e.g. teachers) cannot self-approve their own drafts without independent peer review
  if (authorId && user.id === authorId) {
    return false; // Strict separation of duties
  }
  return true;
}

export function canAccessPdf(user: SessionUser | null): boolean {
  if (!user) return false;
  return isAnyStaff(user);
}

export function canImportPdf(user: SessionUser | null): boolean {
  if (!user) return false;
  return isAdmin(user) || hasRole(user, "CONTENT_MANAGER") || isTeacher(user);
}

export function canManagePdf(user: SessionUser | null): boolean {
  if (!user) return false;
  return isAdmin(user) || hasRole(user, "CONTENT_MANAGER");
}

export function canGenerateAiQuestions(user: SessionUser | null): boolean {
  if (!user) return false;
  return isAdmin(user) || hasRole(user, "CONTENT_MANAGER") || isTeacher(user);
}


