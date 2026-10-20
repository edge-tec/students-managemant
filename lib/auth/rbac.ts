import { SessionUser } from "./jwt";
import { UserRoleType } from "@prisma/client";

export function hasRole(user: SessionUser | null, role: UserRoleType): boolean {
  if (!user || !user.roles) return false;
  if (user.roles.includes("SUPER_ADMIN")) return true;
  return user.roles.includes(role);
}

export function isAdmin(user: SessionUser | null): boolean {
  return hasRole(user, "ADMIN") || hasRole(user, "SUPER_ADMIN");
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
