import prisma from "@/lib/db/prisma";
import { UserRoleType, ExamCategoryType } from "@prisma/client";
import { AuditService } from "@/lib/audit/auditService";
import { EmailService } from "@/lib/email/emailService";
import { hashPassword } from "@/lib/auth/password";
import crypto from "crypto";

export interface ListUsersParams {
  search?: string;
  role?: UserRoleType;
  isActive?: boolean;
  page?: number;
  limit?: number;
}

export class AdminUserService {
  /**
   * Retrieves paginated users with role and summary metrics.
   */
  static async listUsers(params: ListUsersParams = {}) {
    const { search, role, isActive, page = 1, limit = 20 } = params;
    const skip = (Math.max(1, page) - 1) * Math.min(100, Math.max(1, limit));
    const take = Math.min(100, Math.max(1, limit));

    const where: Record<string, unknown> = {};

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    if (role) {
      where.userRoles = {
        some: {
          role: {
            name: role,
          },
        },
      };
    }

    if (search && search.trim()) {
      const q = search.trim();
      where.OR = [
        { fullName: { contains: q, mode: "insensitive" } },
        { fullNameBn: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
        { phoneNumber: { contains: q, mode: "insensitive" } },
        { id: q },
      ];
    }

    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          fullName: true,
          fullNameBn: true,
          email: true,
          phoneNumber: true,
          isActive: true,
          isVerified: true,
          preferredLang: true,
          createdAt: true,
          updatedAt: true,
          profile: {
            select: {
              institutionName: true,
              targetCategory: true,
              district: true,
              hscYear: true,
              sscYear: true,
            },
          },
          userRoles: {
            include: {
              role: {
                select: { id: true, name: true, description: true },
              },
            },
          },
          _count: {
            select: {
              examSessions: true,
              subscriptions: true,
              createdQuestions: true,
            },
          },
        },
      }),
    ]);

    return {
      total,
      page,
      limit: take,
      totalPages: Math.ceil(total / take),
      users: users.map((u) => ({
        id: u.id,
        fullName: u.fullName,
        fullNameBn: u.fullNameBn,
        email: u.email,
        phoneNumber: u.phoneNumber,
        isActive: u.isActive,
        isVerified: u.isVerified,
        preferredLang: u.preferredLang,
        createdAt: u.createdAt,
        updatedAt: u.updatedAt,
        institution: u.profile?.institutionName || null,
        targetCategory: u.profile?.targetCategory || null,
        district: u.profile?.district || null,
        roles: u.userRoles.map((ur) => ur.role.name),
        examCount: u._count.examSessions,
        subscriptionCount: u._count.subscriptions,
        createdQuestionsCount: u._count.createdQuestions,
      })),
    };
  }

  /**
   * Retrieves single user detail with recent activity & history.
   */
  static async getUserDetails(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        fullName: true,
        fullNameBn: true,
        email: true,
        phoneNumber: true,
        isActive: true,
        isVerified: true,
        preferredLang: true,
        avatarUrl: true,
        createdAt: true,
        updatedAt: true,
        profile: true,
        userRoles: {
          include: { role: true },
        },
        subscriptions: {
          take: 5,
          orderBy: { createdAt: "desc" },
          include: { plan: true },
        },
        paymentOrders: {
          take: 5,
          orderBy: { createdAt: "desc" },
        },
        examSessions: {
          take: 5,
          orderBy: { createdAt: "desc" },
          include: { exam: { select: { titleBn: true, titleEn: true } }, result: true },
        },
      },
    });

    if (!user) {
      throw new Error("User not found");
    }

    return {
      ...user,
      roles: user.userRoles.map((ur) => ur.role.name),
    };
  }

  /**
   * Suspends or reactivates a user account with safety checks.
   */
  static async updateUserStatus(
    userId: string,
    isActive: boolean,
    reason: string,
    actorId: string,
    ipAddress?: string
  ) {
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      include: { userRoles: { include: { role: true } } },
    });

    if (!targetUser) {
      throw new Error("User not found");
    }

    const isTargetSuperAdmin = targetUser.userRoles.some(
      (ur) => ur.role.name === UserRoleType.SUPER_ADMIN
    );

    // Prevent suspending the last remaining Super Admin
    if (!isActive && isTargetSuperAdmin) {
      const activeSuperAdmins = await prisma.user.count({
        where: {
          isActive: true,
          userRoles: {
            some: {
              role: {
                name: UserRoleType.SUPER_ADMIN,
              },
            },
          },
        },
      });

      if (activeSuperAdmins <= 1) {
        throw new Error("Security Violation: Cannot suspend the last remaining Super Administrator.");
      }
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { isActive },
    });

    await AuditService.log({
      userId: actorId,
      action: "USER_STATUS_UPDATED",
      resource: "User",
      resourceId: userId,
      details: {
        previousState: targetUser.isActive,
        newState: isActive,
        targetEmail: targetUser.email,
        reason: reason || (isActive ? "Account reactivated by administrator" : "Account suspended by administrator"),
      },
      ipAddress,
    });

    return updated;
  }

  /**
   * Updates user roles with strict Super Admin protection.
   */
  static async updateUserRoles(
    userId: string,
    newRoleNames: UserRoleType[],
    actorId: string,
    ipAddress?: string
  ) {
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      include: { userRoles: { include: { role: true } } },
    });

    if (!targetUser) {
      throw new Error("User not found");
    }

    const currentRoleNames = targetUser.userRoles.map((ur) => ur.role.name);
    const wasSuperAdmin = currentRoleNames.includes(UserRoleType.SUPER_ADMIN);
    const willBeSuperAdmin = newRoleNames.includes(UserRoleType.SUPER_ADMIN);

    // If removing SUPER_ADMIN from user, ensure another active SUPER_ADMIN exists
    if (wasSuperAdmin && !willBeSuperAdmin) {
      const otherSuperAdmins = await prisma.user.count({
        where: {
          id: { not: userId },
          isActive: true,
          userRoles: {
            some: {
              role: {
                name: UserRoleType.SUPER_ADMIN,
              },
            },
          },
        },
      });

      if (otherSuperAdmins === 0) {
        throw new Error("Security Violation: Cannot remove the last remaining Super Administrator role.");
      }
    }

    // Fetch Role IDs from database
    const rolesInDb = await prisma.role.findMany({
      where: { name: { in: newRoleNames } },
    });

    await prisma.$transaction(async (tx) => {
      // Remove existing roles
      await tx.userRole.deleteMany({
        where: { userId },
      });

      // Add new roles
      if (rolesInDb.length > 0) {
        await tx.userRole.createMany({
          data: rolesInDb.map((r) => ({
            userId,
            roleId: r.id,
          })),
        });
      }
    });

    await AuditService.log({
      userId: actorId,
      action: "USER_ROLES_UPDATED",
      resource: "User",
      resourceId: userId,
      details: {
        targetEmail: targetUser.email,
        previousRoles: currentRoleNames,
        newRoles: newRoleNames,
      },
      ipAddress,
    });

    return {
      userId,
      roles: newRoleNames,
    };
  }

  /**
   * Generates a secure, expiring password-reset token without revealing passwords.
   */
  static async triggerPasswordReset(userId: string, actorId: string, ipAddress?: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error("User not found");
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    const expiresAtMs = Date.now() + 60 * 60 * 1000;

    await prisma.user.update({
      where: { id: userId },
      data: {
        verificationToken: `reset_${resetToken}_${expiresAtMs}`,
      },
    });

    const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/reset-password?token=${resetToken}&email=${encodeURIComponent(user.email)}`;

    await AuditService.log({
      userId: actorId,
      action: "PASSWORD_RESET_TRIGGERED",
      resource: "User",
      resourceId: userId,
      details: {
        targetEmail: user.email,
        initiatedBy: actorId,
      },
      ipAddress,
    });

    const expiresAt = new Date(expiresAtMs).toISOString();

    // Dispatch transactional password reset email
    await EmailService.sendPasswordResetEmail(user.email, user.fullName || "User", resetUrl, ipAddress).catch((err) => {
      console.error("Failed to dispatch admin password reset email:", err);
    });

    return {
      success: true,
      email: user.email,
      resetToken,
      resetUrl,
      expiresAt,
      message: "Password reset initiated securely. Token generated.",
    };
  }

  /**
   * Validates whether a password reset token is authentic and unexpired.
   */
  static async verifyPasswordResetToken(email: string, token: string) {
    const cleanEmail = email.trim().toLowerCase();
    const user = await prisma.user.findUnique({
      where: { email: cleanEmail },
      select: { id: true, email: true, isActive: true, verificationToken: true },
    });

    if (!user || !user.isActive || !user.verificationToken) {
      return { valid: false, message: "Invalid or expired password reset link." };
    }

    const stored = user.verificationToken;
    if (!stored.startsWith("reset_")) {
      return { valid: false, message: "Invalid or expired password reset link." };
    }

    const parts = stored.split("_");
    const storedToken = parts[1];
    const expiryMs = parts[2] ? parseInt(parts[2], 10) : null;

    if (storedToken !== token) {
      return { valid: false, message: "Invalid or expired password reset link." };
    }

    if (expiryMs && Date.now() > expiryMs) {
      return { valid: false, message: "Password reset link has expired. Please request a new one." };
    }

    return { valid: true, userId: user.id };
  }

  /**
   * Redeems a password reset token and securely updates the user's password.
   * Single-use: clears the verification token immediately upon redemption.
   */
  static async resetPasswordWithToken(
    email: string,
    token: string,
    newPassword: string,
    ipAddress?: string
  ) {
    const verification = await this.verifyPasswordResetToken(email, token);
    if (!verification.valid || !verification.userId) {
      throw new Error(verification.message || "Invalid or expired password reset link.");
    }

    const newPasswordHash = await hashPassword(newPassword);

    await prisma.user.update({
      where: { id: verification.userId },
      data: {
        passwordHash: newPasswordHash,
        verificationToken: null, // Single-use enforcement
      },
    });

    await AuditService.log({
      userId: verification.userId,
      action: "PASSWORD_RESET_COMPLETED",
      resource: "User",
      resourceId: verification.userId,
      details: {
        email: email.trim().toLowerCase(),
      },
      ipAddress,
    });

    return {
      success: true,
      message: "Your password has been successfully reset. Please log in with your new credentials.",
    };
  }

  /**
   * Public self-service password reset request (Forgot Password).
   * Generic response prevents user enumeration.
   */
  static async requestSelfPasswordReset(email: string, ipAddress?: string) {
    const cleanEmail = email.trim().toLowerCase();
    const user = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });

    if (user && user.isActive) {
      const resetToken = crypto.randomBytes(32).toString("hex");
      const expiresAtMs = Date.now() + 60 * 60 * 1000;

      await prisma.user.update({
        where: { id: user.id },
        data: {
          verificationToken: `reset_${resetToken}_${expiresAtMs}`,
        },
      });

      await AuditService.log({
        userId: user.id,
        action: "PASSWORD_RESET_SELF_REQUESTED",
        resource: "User",
        resourceId: user.id,
        details: {
          email: cleanEmail,
        },
        ipAddress,
      });

      const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/reset-password?token=${resetToken}&email=${encodeURIComponent(cleanEmail)}`;

      // Dispatch transactional password reset email
      await EmailService.sendPasswordResetEmail(cleanEmail, user.fullName || "User", resetUrl, ipAddress).catch((err) => {
        console.error("Failed to dispatch self-service password reset email:", err);
      });

      return {
        success: true,
        resetToken,
        resetUrl,
        message: "If an account exists with this email, password reset instructions have been generated.",
      };
    }

    return {
      success: true,
      message: "If an account exists with this email, password reset instructions have been generated.",
    };
  }

  /**
   * Convenience wrapper for status toggle (ACTIVE / SUSPENDED)
   */
  static async updateStatus(userId: string, status: "ACTIVE" | "SUSPENDED", actorId: string) {
    const updated = await this.updateUserStatus(
      userId,
      status === "ACTIVE",
      status === "ACTIVE" ? "Reactivated" : "Suspended",
      actorId
    );
    return {
      ...updated,
      status: updated.isActive ? "ACTIVE" : "SUSPENDED",
    };
  }

  /**
   * Convenience wrapper for managing single role (ASSIGN / REVOKE)
   */
  static async manageRole(userId: string, role: UserRoleType, action: "ASSIGN" | "REVOKE", actorId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { userRoles: { include: { role: true } } },
    });
    if (!user) throw new Error("User not found");

    const currentRoles = user.userRoles.map((ur) => ur.role.name);
    let newRoles: UserRoleType[];

    if (action === "ASSIGN") {
      newRoles = Array.from(new Set([...currentRoles, role]));
    } else {
      newRoles = currentRoles.filter((r) => r !== role);
    }

    return await this.updateUserRoles(userId, newRoles, actorId);
  }

  /**
   * Convenience wrapper for password reset link generation
   */
  static async generatePasswordResetLink(userId: string, actorId: string) {
    return await this.triggerPasswordReset(userId, actorId);
  }

  /**
   * Creates a new user with secure password hashing, roles, and profile.
   */
  static async createUser(
    data: {
      email: string;
      fullName: string;
      fullNameBn?: string;
      phoneNumber?: string;
      password?: string;
      preferredLang?: string;
      isVerified?: boolean;
      roles?: UserRoleType[];
      profile?: {
        targetCategory?: ExamCategoryType;
        institutionName?: string;
        district?: string;
        division?: string;
        sscYear?: number;
        hscYear?: number;
        bio?: string;
      };
    },
    actorId: string,
    ipAddress?: string
  ) {
    if (!data.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim())) {
      throw new Error("A valid email address is required.");
    }
    if (!data.fullName || data.fullName.trim().length === 0) {
      throw new Error("Full name is required.");
    }

    const cleanEmail = data.email.trim().toLowerCase();
    const cleanPhone = data.phoneNumber?.trim() || null;

    const existing = await prisma.user.findFirst({
      where: {
        OR: [
          { email: cleanEmail },
          ...(cleanPhone ? [{ phoneNumber: cleanPhone }] : []),
        ],
      },
    });

    if (existing) {
      if (existing.email === cleanEmail) {
        throw new Error(`A user with email '${cleanEmail}' already exists.`);
      }
      throw new Error(`A user with phone number '${cleanPhone}' already exists.`);
    }

    const rawPassword =
      data.password && data.password.length >= 6
        ? data.password
        : crypto.randomBytes(6).toString("hex") + "A1!";
    const passwordHash = await hashPassword(rawPassword);

    const requestedRoles =
      data.roles && data.roles.length > 0
        ? data.roles
        : [UserRoleType.STUDENT];

    const dbRoles = await prisma.role.findMany({
      where: { name: { in: requestedRoles } },
    });

    const user = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email: cleanEmail,
          fullName: data.fullName.trim(),
          fullNameBn: data.fullNameBn?.trim() || null,
          phoneNumber: cleanPhone,
          passwordHash,
          preferredLang: data.preferredLang || "bn",
          isVerified: data.isVerified ?? true,
          isActive: true,
          profile: data.profile
            ? {
                create: {
                  targetCategory: data.profile.targetCategory || null,
                  institutionName: data.profile.institutionName || null,
                  district: data.profile.district || null,
                  division: data.profile.division || null,
                  sscYear: data.profile.sscYear || null,
                  hscYear: data.profile.hscYear || null,
                  bio: data.profile.bio || null,
                },
              }
            : undefined,
        },
      });

      if (dbRoles.length > 0) {
        await tx.userRole.createMany({
          data: dbRoles.map((r) => ({
            userId: newUser.id,
            roleId: r.id,
          })),
        });
      }

      return newUser;
    });

    await AuditService.log({
      userId: actorId,
      action: "USER_CREATED",
      resource: "User",
      resourceId: user.id,
      details: {
        createdEmail: user.email,
        roles: requestedRoles,
        hasCustomPassword: !!data.password,
      },
      ipAddress,
    });

    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      fullNameBn: user.fullNameBn,
      phoneNumber: user.phoneNumber,
      isVerified: user.isVerified,
      isActive: user.isActive,
      preferredLang: user.preferredLang,
      roles: requestedRoles,
      generatedPassword: data.password ? undefined : rawPassword,
    };
  }

  /**
   * Updates an existing user's profile and basic information.
   */
  static async updateUserProfile(
    userId: string,
    data: {
      fullName?: string;
      fullNameBn?: string;
      phoneNumber?: string;
      preferredLang?: string;
      isVerified?: boolean;
      profile?: {
        targetCategory?: ExamCategoryType;
        institutionName?: string;
        district?: string;
        division?: string;
        sscYear?: number;
        hscYear?: number;
        bio?: string;
      };
    },
    actorId: string,
    ipAddress?: string
  ) {
    const existing = await prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });

    if (!existing) {
      throw new Error("User not found");
    }

    if (data.phoneNumber && data.phoneNumber !== existing.phoneNumber) {
      const phoneTaken = await prisma.user.findFirst({
        where: {
          phoneNumber: data.phoneNumber.trim(),
          id: { not: userId },
        },
      });
      if (phoneTaken) {
        throw new Error(`Phone number '${data.phoneNumber}' is already in use by another user.`);
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      const userUpdate = await tx.user.update({
        where: { id: userId },
        data: {
          fullName: data.fullName !== undefined ? data.fullName.trim() : undefined,
          fullNameBn: data.fullNameBn !== undefined ? data.fullNameBn.trim() : undefined,
          phoneNumber: data.phoneNumber !== undefined ? data.phoneNumber.trim() || null : undefined,
          preferredLang: data.preferredLang !== undefined ? data.preferredLang : undefined,
          isVerified: data.isVerified !== undefined ? data.isVerified : undefined,
        },
      });

      if (data.profile) {
        await tx.userProfile.upsert({
          where: { userId },
          create: {
            userId,
            targetCategory: data.profile.targetCategory || null,
            institutionName: data.profile.institutionName || null,
            district: data.profile.district || null,
            division: data.profile.division || null,
            sscYear: data.profile.sscYear || null,
            hscYear: data.profile.hscYear || null,
            bio: data.profile.bio || null,
          },
          update: {
            targetCategory: data.profile.targetCategory !== undefined ? data.profile.targetCategory : undefined,
            institutionName: data.profile.institutionName !== undefined ? data.profile.institutionName : undefined,
            district: data.profile.district !== undefined ? data.profile.district : undefined,
            division: data.profile.division !== undefined ? data.profile.division : undefined,
            sscYear: data.profile.sscYear !== undefined ? data.profile.sscYear : undefined,
            hscYear: data.profile.hscYear !== undefined ? data.profile.hscYear : undefined,
            bio: data.profile.bio !== undefined ? data.profile.bio : undefined,
          },
        });
      }

      return userUpdate;
    });

    await AuditService.log({
      userId: actorId,
      action: "USER_PROFILE_UPDATED",
      resource: "User",
      resourceId: userId,
      details: {
        updatedFields: Object.keys(data),
      },
      ipAddress,
    });

    return updated;
  }

  /**
   * Bulk updates user status (activate / suspend) with Super Admin protection.
   */
  static async bulkUpdateStatus(
    userIds: string[],
    isActive: boolean,
    reason: string,
    actorId: string,
    ipAddress?: string
  ) {
    const uniqueIds = Array.from(new Set(userIds.filter(Boolean)));
    if (uniqueIds.length === 0) {
      return { updatedCount: 0, skippedCount: 0, affectedIds: [] };
    }

    let safeIds = [...uniqueIds];

    if (!isActive) {
      // Find any Super Admins in the target list
      const superAdminUsers = await prisma.user.findMany({
        where: {
          id: { in: uniqueIds },
          isActive: true,
          userRoles: {
            some: {
              role: {
                name: UserRoleType.SUPER_ADMIN,
              },
            },
          },
        },
        select: { id: true },
      });

      if (superAdminUsers.length > 0) {
        const totalActiveSuperAdmins = await prisma.user.count({
          where: {
            isActive: true,
            userRoles: {
              some: {
                role: {
                  name: UserRoleType.SUPER_ADMIN,
                },
              },
            },
          },
        });

        // If deactivating these super admins leaves 0 active super admins, exclude them
        if (totalActiveSuperAdmins - superAdminUsers.length <= 0) {
          const superAdminIdsToProtect = new Set(superAdminUsers.map((u) => u.id));
          safeIds = uniqueIds.filter((id) => !superAdminIdsToProtect.has(id));

          if (safeIds.length === 0) {
            throw new Error("Security Violation: Cannot suspend the last remaining Super Administrator.");
          }
        }
      }
    }

    if (safeIds.length > 0) {
      await prisma.user.updateMany({
        where: { id: { in: safeIds } },
        data: { isActive },
      });

      await AuditService.log({
        userId: actorId,
        action: "USER_STATUS_BULK_UPDATED",
        resource: "User",
        details: {
          targetIds: safeIds,
          requestedTotal: uniqueIds.length,
          updatedCount: safeIds.length,
          skippedCount: uniqueIds.length - safeIds.length,
          isActive,
          reason,
        },
        ipAddress,
      });
    }

    return {
      updatedCount: safeIds.length,
      skippedCount: uniqueIds.length - safeIds.length,
      affectedIds: safeIds,
    };
  }

  /**
   * Bulk assigns a role to multiple users with authorization check.
   */
  static async bulkAssignRole(
    userIds: string[],
    role: UserRoleType,
    actorId: string,
    ipAddress?: string
  ) {
    const uniqueIds = Array.from(new Set(userIds.filter(Boolean)));
    if (uniqueIds.length === 0) {
      return { affectedCount: 0, role };
    }

    if (role === UserRoleType.SUPER_ADMIN) {
      const actorRoles = await prisma.userRole.findMany({
        where: { userId: actorId },
        include: { role: true },
      });
      const isActorSuperAdmin = actorRoles.some((ur) => ur.role.name === UserRoleType.SUPER_ADMIN);
      if (!isActorSuperAdmin) {
        throw new Error("Unauthorized: Only Super Administrators can grant the Super Administrator role.");
      }
    }

    const targetRole = await prisma.role.findUnique({
      where: { name: role },
    });

    if (!targetRole) {
      throw new Error(`Role '${role}' does not exist.`);
    }

    // Find who already has this role
    const existingAssignments = await prisma.userRole.findMany({
      where: {
        userId: { in: uniqueIds },
        roleId: targetRole.id,
      },
      select: { userId: true },
    });

    const alreadyAssigned = new Set(existingAssignments.map((a) => a.userId));
    const toAssign = uniqueIds.filter((id) => !alreadyAssigned.has(id));

    if (toAssign.length > 0) {
      await prisma.userRole.createMany({
        data: toAssign.map((userId) => ({
          userId,
          roleId: targetRole.id,
        })),
      });

      await AuditService.log({
        userId: actorId,
        action: "USER_ROLES_BULK_ASSIGNED",
        resource: "UserRole",
        details: {
          role,
          assignedUserIds: toAssign,
          totalAssigned: toAssign.length,
        },
        ipAddress,
      });
    }

    return {
      affectedCount: toAssign.length,
      role,
    };
  }

  /**
   * Safely imports users from structured CSV rows with row-level validation and duplicate detection.
   */
  static async importUsersFromCsv(
    rows: Array<{
      email: string;
      fullName: string;
      fullNameBn?: string;
      phoneNumber?: string;
      role?: string;
      institution?: string;
      targetCategory?: string;
    }>,
    actorId: string,
    ipAddress?: string
  ) {
    const totalRows = rows.length;
    const errors: Array<{ rowNumber: number; email?: string; errorMessage: string }> = [];
    const validRows: Array<{
      rowNumber: number;
      email: string;
      fullName: string;
      fullNameBn?: string;
      phoneNumber?: string;
      role: UserRoleType;
      institution?: string;
      targetCategory?: ExamCategoryType;
    }> = [];

    const seenEmailsInBatch = new Set<string>();
    const seenPhonesInBatch = new Set<string>();

    // 1. Initial row validation
    for (let i = 0; i < rows.length; i++) {
      const rowNum = i + 1;
      const row = rows[i];
      const cleanEmail = (row.email || "").trim().toLowerCase();
      const cleanName = (row.fullName || "").trim();
      const cleanPhone = (row.phoneNumber || "").trim() || undefined;

      if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
        errors.push({ rowNumber: rowNum, email: cleanEmail, errorMessage: "Invalid or missing email address." });
        continue;
      }

      if (!cleanName) {
        errors.push({ rowNumber: rowNum, email: cleanEmail, errorMessage: "Full name is required." });
        continue;
      }

      if (seenEmailsInBatch.has(cleanEmail)) {
        errors.push({
          rowNumber: rowNum,
          email: cleanEmail,
          errorMessage: `Duplicate email '${cleanEmail}' within import file.`,
        });
        continue;
      }
      seenEmailsInBatch.add(cleanEmail);

      if (cleanPhone) {
        if (seenPhonesInBatch.has(cleanPhone)) {
          errors.push({
            rowNumber: rowNum,
            email: cleanEmail,
            errorMessage: `Duplicate phone number '${cleanPhone}' within import file.`,
          });
          continue;
        }
        seenPhonesInBatch.add(cleanPhone);
      }

      let assignedRole: UserRoleType = UserRoleType.STUDENT;
      if (row.role) {
        const uppercaseRole = row.role.trim().toUpperCase() as UserRoleType;
        if (Object.values(UserRoleType).includes(uppercaseRole)) {
          assignedRole = uppercaseRole;
        }
      }

      let targetCategory: ExamCategoryType | undefined = undefined;
      if (row.targetCategory) {
        const upperCategory = row.targetCategory.trim().toUpperCase() as ExamCategoryType;
        if (Object.values(ExamCategoryType).includes(upperCategory)) {
          targetCategory = upperCategory;
        }
      }

      validRows.push({
        rowNumber: rowNum,
        email: cleanEmail,
        fullName: cleanName,
        fullNameBn: row.fullNameBn?.trim(),
        phoneNumber: cleanPhone,
        role: assignedRole,
        institution: row.institution?.trim(),
        targetCategory,
      });
    }

    // 2. Database duplicate detection
    if (validRows.length > 0) {
      const candidateEmails = validRows.map((r) => r.email);
      const candidatePhones = validRows.map((r) => r.phoneNumber).filter(Boolean) as string[];

      const existingUsers = await prisma.user.findMany({
        where: {
          OR: [
            { email: { in: candidateEmails } },
            ...(candidatePhones.length > 0 ? [{ phoneNumber: { in: candidatePhones } }] : []),
          ],
        },
        select: { email: true, phoneNumber: true },
      });

      const existingEmailSet = new Set(existingUsers.map((u) => u.email.toLowerCase()));
      const existingPhoneSet = new Set(existingUsers.map((u) => u.phoneNumber).filter(Boolean) as string[]);

      const toCreate: typeof validRows = [];

      for (const row of validRows) {
        if (existingEmailSet.has(row.email)) {
          errors.push({
            rowNumber: row.rowNumber,
            email: row.email,
            errorMessage: `Account with email '${row.email}' already exists in database.`,
          });
          continue;
        }
        if (row.phoneNumber && existingPhoneSet.has(row.phoneNumber)) {
          errors.push({
            rowNumber: row.rowNumber,
            email: row.email,
            errorMessage: `Account with phone number '${row.phoneNumber}' already exists in database.`,
          });
          continue;
        }
        toCreate.push(row);
      }

      // 3. Batch creation of verified rows
      const createdUsers: Array<{ id: string; email: string; fullName: string; role: string }> = [];

      const rolesInDb = await prisma.role.findMany();
      const roleMap = new Map(rolesInDb.map((r) => [r.name, r.id]));

      for (const item of toCreate) {
        const rawPassword = crypto.randomBytes(6).toString("hex") + "A1!";
        const passwordHash = await hashPassword(rawPassword);
        const roleId = roleMap.get(item.role) || roleMap.get(UserRoleType.STUDENT);

        const newUser = await prisma.$transaction(async (tx) => {
          const user = await tx.user.create({
            data: {
              email: item.email,
              fullName: item.fullName,
              fullNameBn: item.fullNameBn || null,
              phoneNumber: item.phoneNumber || null,
              passwordHash,
              isVerified: true,
              isActive: true,
              profile:
                item.institution || item.targetCategory
                  ? {
                      create: {
                        institutionName: item.institution || null,
                        targetCategory: item.targetCategory || null,
                      },
                    }
                  : undefined,
            },
          });

          if (roleId) {
            await tx.userRole.create({
              data: {
                userId: user.id,
                roleId,
              },
            });
          }

          return user;
        });

        createdUsers.push({
          id: newUser.id,
          email: newUser.email,
          fullName: newUser.fullName,
          role: item.role,
        });
      }

      await AuditService.log({
        userId: actorId,
        action: "USERS_CSV_IMPORTED",
        resource: "User",
        details: {
          totalRows,
          successfulCount: createdUsers.length,
          failedCount: errors.length,
        },
        ipAddress,
      });

      return {
        totalRows,
        successfulRows: createdUsers.length,
        failedRows: errors.length,
        errors,
        createdUsers,
      };
    }

    return {
      totalRows,
      successfulRows: 0,
      failedRows: errors.length,
      errors,
      createdUsers: [],
    };
  }

  /**
   * Retrieves full learning and examination activity history for a user.
   */
  static async getUserFullLearningHistory(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        fullName: true,
        fullNameBn: true,
        email: true,
        phoneNumber: true,
        isActive: true,
        isVerified: true,
        preferredLang: true,
        createdAt: true,
        profile: true,
        userRoles: { include: { role: true } },
      },
    });

    if (!user) {
      throw new Error("User not found");
    }

    const [
      examSessions,
      wrongQuestionsStats,
      bookmarksCount,
      classEnrollments,
      courseEnrollments,
      studyStreak,
    ] = await Promise.all([
      prisma.examSession.findMany({
        where: { studentId: userId },
        orderBy: { createdAt: "desc" },
        take: 50,
        include: {
          exam: {
            select: {
              id: true,
              titleBn: true,
              titleEn: true,
              category: true,
            },
          },
          result: {
            select: {
              id: true,
              totalScore: true,
              maxMarks: true,
              correctCount: true,
              incorrectCount: true,
              unansweredCount: true,
              accuracyPct: true,
              timeSpentSec: true,
              rankInCohort: true,
              cohortSize: true,
              isPassed: true,
              evaluatedAt: true,
            },
          },
        },
      }),
      prisma.wrongQuestion.groupBy({
        by: ["isMastered"],
        where: { studentId: userId },
        _count: { id: true },
      }),
      prisma.bookmark.count({ where: { studentId: userId } }),
      prisma.classEnrollment.findMany({
        where: { studentId: userId },
        include: { academicClass: true },
        orderBy: { enrolledAt: "desc" },
      }),
      prisma.courseEnrollment.findMany({
        where: { studentId: userId },
        include: { course: true },
        orderBy: { enrolledAt: "desc" },
      }),
      prisma.studyStreak.findUnique({ where: { studentId: userId } }),
    ]);

    const masteredMistakes = wrongQuestionsStats.find((s) => s.isMastered)?._count.id || 0;
    const unmasteredMistakes = wrongQuestionsStats.find((s) => !s.isMastered)?._count.id || 0;

    return {
      user: {
        ...user,
        roles: user.userRoles.map((ur) => ur.role.name),
      },
      examSessions: examSessions.map((s) => ({
        id: s.id,
        examTitle: s.exam?.titleBn || s.exam?.titleEn || "Custom / Practice Exam",
        category: s.category,
        mode: s.mode,
        status: s.status,
        durationMinutes: s.durationMinutes,
        serverStartTime: s.serverStartTime,
        submittedAt: s.submittedAt,
        correctMark: s.correctMark,
        negativeMark: s.negativeMark,
        attemptNumber: s.attemptNumber,
        result: s.result,
      })),
      academic: {
        classEnrollments,
        courseEnrollments,
      },
      analytics: {
        totalExamsTaken: examSessions.length,
        completedExams: examSessions.filter((s) => s.status === "SUBMITTED" || s.status === "EVALUATED").length,
        totalMistakesRecorded: masteredMistakes + unmasteredMistakes,
        unmasteredMistakes,
        masteredMistakes,
        bookmarksCount,
        streakDays: studyStreak?.currentStreak || 0,
        longestStreak: studyStreak?.longestStreak || 0,
      },
    };
  }
}

export { AdminUserService as UserService };

