import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { isContentStaff } from "@/lib/auth/rbac";
import { QuestionDraftService } from "@/lib/pdf/questionDraftService";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    if (!user || !isContentStaff(user)) {
      return NextResponse.json({ error: "Unauthorized to regenerate question drafts" }, { status: 403 });
    }

    const updated = await QuestionDraftService.regenerateDraft(id, user);

    return NextResponse.json({
      success: true,
      message: "Question regenerated successfully from source page context.",
      draft: updated,
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Regenerate question error:", err);
    return NextResponse.json({ error: err.message || "Failed to regenerate question" }, { status: 500 });
  }
}
