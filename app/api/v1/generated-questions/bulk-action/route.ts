import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { isContentStaff } from "@/lib/auth/rbac";
import { QuestionDraftService } from "@/lib/pdf/questionDraftService";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || !isContentStaff(user)) {
      return NextResponse.json({ error: "Unauthorized for bulk question review" }, { status: 403 });
    }

    const body = await req.json();
    const { draftIds, action, importId, allForImport } = body;

    if (!["APPROVE", "REJECT", "DELETE"].includes(action)) {
      return NextResponse.json({ error: "Invalid action. Must be APPROVE, REJECT, or DELETE" }, { status: 400 });
    }

    if (allForImport && importId) {
      const result = await QuestionDraftService.approveAllForImport(importId, user);
      return NextResponse.json({
        success: true,
        message: `সকল (${result.count} টি) প্রশ্ন সফলভাবে অনুমোদিত হয়েছে।`,
        count: result.count,
      });
    }

    if (!Array.isArray(draftIds) || draftIds.length === 0) {
      return NextResponse.json({ error: "draftIds array is required" }, { status: 400 });
    }

    const result = await QuestionDraftService.bulkAction(draftIds, action, user);

    return NextResponse.json({
      success: true,
      message: `Bulk action '${action}' processed for ${result.count} questions.`,
      count: result.count,
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Bulk action error:", err);
    return NextResponse.json({ error: err.message || "Bulk action failed" }, { status: 400 });
  }
}
