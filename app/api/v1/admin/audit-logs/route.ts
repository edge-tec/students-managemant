import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { canAccessAudit } from "@/lib/auth/rbac";
import { AuditService } from "@/lib/audit/auditService";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || !canAccessAudit(user)) {
      return NextResponse.json({ error: "Unauthorized access to audit logs" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const action = searchParams.get("action") || undefined;
    const resource = searchParams.get("resource") || undefined;
    const userId = searchParams.get("userId") || undefined;
    const search = searchParams.get("search") || undefined;

    const result = await AuditService.listAuditLogs({
      page,
      limit,
      action,
      resource,
      userId,
      search,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Admin audit logs GET error:", error);
    return NextResponse.json({ error: "Failed to fetch audit logs" }, { status: 500 });
  }
}
