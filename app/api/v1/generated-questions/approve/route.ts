import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { isContentStaff } from "@/lib/auth/rbac";
import { QuestionDraftService } from "@/lib/pdf/questionDraftService";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || !isContentStaff(user)) {
      return NextResponse.json({ error: "Unauthorized to approve questions" }, { status: 403 });
    }

    const body = await req.json();
    const { draftId, notes } = body;

    if (!draftId) {
      return NextResponse.json({ error: "draftId is required" }, { status: 400 });
    }

    const updated = await QuestionDraftService.approveDraft(draftId, user, notes);

    return NextResponse.json({
      success: true,
      message: "Question approved.",
      draft: updated,
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Approve question error:", err);
    return NextResponse.json({ error: err.message || "Failed to approve question" }, { status: 400 });
  }
}
