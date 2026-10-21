import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { isContentStaff } from "@/lib/auth/rbac";
import { QuestionService } from "@/lib/questions/questionService";
import { ResolveQuestionReportSchema } from "@/lib/validation/schemas";
import { ReportReason, ReportStatus } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || !isContentStaff(user)) {
      return NextResponse.json({ error: "Unauthorized: Content staff only" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);

    const statusParam = searchParams.get("status");
    const status =
      statusParam && Object.values(ReportStatus).includes(statusParam as ReportStatus)
        ? (statusParam as ReportStatus)
        : undefined;

    const reasonParam = searchParams.get("reason");
    const reason =
      reasonParam && Object.values(ReportReason).includes(reasonParam as ReportReason)
        ? (reasonParam as ReportReason)
        : undefined;

    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "15", 10)));
    const search = searchParams.get("search") || searchParams.get("q") || undefined;

    const result = await QuestionService.listQuestionReports({
      status,
      reason,
      search,
      page,
      limit,
    });

    return NextResponse.json(result);
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Admin list question reports error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to retrieve question reports" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || !isContentStaff(user)) {
      return NextResponse.json({ error: "Unauthorized: Content staff only" }, { status: 403 });
    }

    const body = await req.json();
    const validation = ResolveQuestionReportSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0]?.message || "Invalid input data" },
        { status: 400 }
      );
    }

    const { reportId, status, adminNotes } = validation.data;
    const ipAddress =
      req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
      req.headers.get("x-real-ip") ||
      undefined;

    const updated = await QuestionService.resolveQuestionReport(
      reportId,
      status as ReportStatus,
      adminNotes,
      user.id,
      ipAddress
    );

    return NextResponse.json({
      success: true,
      message: `Report status successfully updated to ${status}.`,
      report: updated,
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Admin resolve question report error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to resolve question report" },
      { status: 400 }
    );
  }
}
