import prisma from "@/lib/db/prisma";

export interface CreateAuditLogParams {
  userId?: string | null;
  action: string;
  resource: string;
  resourceId?: string | null;
  details?: Record<string, unknown> | string | null;
  ipAddress?: string | null;
}

export interface ListAuditLogsParams {
  action?: string;
  resource?: string;
  userId?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export class AuditService {
  /**
   * Records an immutable administrative audit event.
   */
  static async log(params: CreateAuditLogParams) {
    try {
      const detailsJson =
        typeof params.details === "object" && params.details !== null
          ? JSON.stringify(params.details)
          : typeof params.details === "string"
          ? params.details
          : null;

      return await prisma.auditLog.create({
        data: {
          userId: params.userId || null,
          action: params.action,
          resource: params.resource,
          resourceId: params.resourceId || null,
          detailsJson,
          ipAddress: params.ipAddress || null,
        },
      });
    } catch (err) {
      console.error("Failed to write audit log:", err);
      // Non-blocking so business transaction doesn't crash on audit logger failure
      return null;
    }
  }

  /**
   * Retrieves paginated audit logs with actor details and filters.
   */
  static async listAuditLogs(params: ListAuditLogsParams = {}) {
    const { action, resource, userId, search, page = 1, limit = 20 } = params;
    const skip = (Math.max(1, page) - 1) * Math.min(100, Math.max(1, limit));
    const take = Math.min(100, Math.max(1, limit));

    const where: Record<string, unknown> = {};

    if (action) {
      where.action = action;
    }

    if (resource) {
      where.resource = resource;
    }

    if (userId) {
      where.userId = userId;
    }

    if (search) {
      where.OR = [
        { action: { contains: search, mode: "insensitive" } },
        { resource: { contains: search, mode: "insensitive" } },
        { detailsJson: { contains: search, mode: "insensitive" } },
      ];
    }

    const [total, logs] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: "desc" },
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              fullNameBn: true,
              email: true,
              userRoles: {
                include: { role: true },
              },
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
      logs: logs.map((log) => ({
        id: log.id,
        action: log.action,
        resource: log.resource,
        resourceId: log.resourceId,
        details: log.detailsJson ? safeParseJson(log.detailsJson) : null,
        ipAddress: log.ipAddress,
        createdAt: log.createdAt,
        actor: log.user
          ? {
              id: log.user.id,
              name: log.user.fullNameBn || log.user.fullName,
              email: log.user.email,
              roles: log.user.userRoles.map((ur) => ur.role.name),
            }
          : { name: "System", email: "system@edubd.ac", roles: ["SYSTEM"] },
      })),
    };
  }
}

function safeParseJson(str: string) {
  try {
    return JSON.parse(str);
  } catch {
    return str;
  }
}
