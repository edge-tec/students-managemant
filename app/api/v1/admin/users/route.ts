import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { canManageUsers } from "@/lib/auth/rbac";
import { AdminUserService } from "@/lib/admin/userService";
import { UserRoleType } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || !canManageUsers(user)) {
      return NextResponse.json({ error: "Unauthorized: Administrators only" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("q") || searchParams.get("search") || undefined;
    const roleParam = searchParams.get("role");
    const role = roleParam && Object.values(UserRoleType).includes(roleParam as UserRoleType)
      ? (roleParam as UserRoleType)
      : undefined;

    const statusParam = searchParams.get("status");
    const isActive = statusParam === "active" ? true : statusParam === "suspended" ? false : undefined;

    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));

    const result = await AdminUserService.listUsers({
      search,
      role,
      isActive,
      page,
      limit,
    });

    return NextResponse.json(result);
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Admin list users error:", err);
    return NextResponse.json({ error: err.message || "Failed to list users" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || !canManageUsers(user)) {
      return NextResponse.json({ error: "Unauthorized: Administrators only" }, { status: 403 });
    }

    const body = await req.json();
    const ipAddress = req.headers.get("x-forwarded-for") || undefined;

    const created = await AdminUserService.createUser(body, user.id, ipAddress);

    return NextResponse.json(
      {
        success: true,
        message: "User created successfully",
        user: created,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Admin create user error:", err);
    return NextResponse.json({ error: err.message || "Failed to create user" }, { status: 400 });
  }
}

