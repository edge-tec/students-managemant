import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { canManageUsers } from "@/lib/auth/rbac";
import { AdminUserService } from "@/lib/admin/userService";
import { UserRoleType } from "@prisma/client";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user || !canManageUsers(user)) {
      return NextResponse.json({ error: "Unauthorized: Administrators only" }, { status: 403 });
    }

    const { id } = await params;
    const details = await AdminUserService.getUserDetails(id);

    return NextResponse.json({ user: details });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Admin get user details error:", err);
    return NextResponse.json({ error: err.message || "Failed to retrieve user" }, { status: 404 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || !canManageUsers(currentUser)) {
      return NextResponse.json({ error: "Unauthorized: Administrators only" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const { action, isActive, reason, roles } = body;
    const ipAddress = req.headers.get("x-forwarded-for") || undefined;

    if (action === "toggle_status" || typeof isActive === "boolean") {
      const updated = await AdminUserService.updateUserStatus(
        id,
        Boolean(isActive),
        reason || "",
        currentUser.id,
        ipAddress
      );
      return NextResponse.json({
        success: true,
        message: `User account has been ${isActive ? "reactivated" : "suspended"}.`,
        user: { id: updated.id, isActive: updated.isActive },
      });
    }

    if (action === "update_roles" && Array.isArray(roles)) {
      // Validate roles enum
      const validRoles = roles.filter((r) => Object.values(UserRoleType).includes(r as UserRoleType));
      const result = await AdminUserService.updateUserRoles(
        id,
        validRoles as UserRoleType[],
        currentUser.id,
        ipAddress
      );
      return NextResponse.json({
        success: true,
        message: "User roles updated successfully.",
        result,
      });
    }

    if (action === "reset_password") {
      const resetResult = await AdminUserService.triggerPasswordReset(
        id,
        currentUser.id,
        ipAddress
      );
      return NextResponse.json(resetResult);
    }

    return NextResponse.json({ error: "Invalid action specified" }, { status: 400 });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Admin update user error:", err);
    return NextResponse.json({ error: err.message || "Failed to update user" }, { status: 400 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || !canManageUsers(currentUser)) {
      return NextResponse.json({ error: "Unauthorized: Administrators only" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const ipAddress = req.headers.get("x-forwarded-for") || undefined;

    const updated = await AdminUserService.updateUserProfile(
      id,
      body,
      currentUser.id,
      ipAddress
    );

    return NextResponse.json({
      success: true,
      message: "User profile updated successfully.",
      user: updated,
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Admin PUT user error:", err);
    return NextResponse.json({ error: err.message || "Failed to update profile" }, { status: 400 });
  }
}

