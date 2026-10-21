import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { canManageUsers } from "@/lib/auth/rbac";
import { AdminUserService } from "@/lib/admin/userService";
import { UserRoleType } from "@prisma/client";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || !canManageUsers(user)) {
      return NextResponse.json({ error: "Unauthorized: Administrators only" }, { status: 403 });
    }

    const body = await req.json();
    const { action, userIds, isActive, reason, role } = body;
    const ipAddress = req.headers.get("x-forwarded-for") || undefined;

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json({ error: "userIds must be a non-empty array of user IDs" }, { status: 400 });
    }

    if (action === "update_status" && typeof isActive === "boolean") {
      const result = await AdminUserService.bulkUpdateStatus(
        userIds,
        isActive,
        reason || (isActive ? "Bulk reactivation" : "Bulk suspension"),
        user.id,
        ipAddress
      );
      return NextResponse.json({
        success: true,
        message: `Bulk status update completed. Updated ${result.updatedCount} accounts.`,
        ...result,
      });
    }

    if (action === "assign_role" && role) {
      if (!Object.values(UserRoleType).includes(role as UserRoleType)) {
        return NextResponse.json({ error: `Invalid role specified: ${role}` }, { status: 400 });
      }

      const result = await AdminUserService.bulkAssignRole(
        userIds,
        role as UserRoleType,
        user.id,
        ipAddress
      );
      return NextResponse.json({
        success: true,
        message: `Assigned role ${role} to ${result.affectedCount} accounts.`,
        ...result,
      });
    }

    return NextResponse.json({ error: "Invalid action or parameters specified" }, { status: 400 });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Admin bulk user action error:", err);
    return NextResponse.json({ error: err.message || "Failed to execute bulk action" }, { status: 400 });
  }
}
