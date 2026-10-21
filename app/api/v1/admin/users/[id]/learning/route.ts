import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { canManageUsers } from "@/lib/auth/rbac";
import { AdminUserService } from "@/lib/admin/userService";

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
    const history = await AdminUserService.getUserFullLearningHistory(id);

    return NextResponse.json(history);
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Admin get user learning history error:", err);
    return NextResponse.json({ error: err.message || "Failed to retrieve learning history" }, { status: 404 });
  }
}
