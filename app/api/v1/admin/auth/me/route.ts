import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { isAnyStaff } from "@/lib/auth/rbac";
import { getUserPermissions } from "@/lib/auth/permissions";

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user || !isAnyStaff(user)) {
      return NextResponse.json(
        { error: "Unauthorized: Administrative access required" },
        { status: 403 }
      );
    }

    const permissions = getUserPermissions(user);

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        roles: user.roles,
        permissions,
        preferredLang: user.preferredLang,
      },
    });
  } catch (error) {
    console.error("Admin auth me error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
