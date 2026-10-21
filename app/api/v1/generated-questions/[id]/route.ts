import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { isContentStaff, isAnyStaff } from "@/lib/auth/rbac";
import { QuestionDraftService } from "@/lib/pdf/questionDraftService";
import prisma from "@/lib/db/prisma";
import { DraftQuestionStatus } from "@prisma/client";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    if (!user || !isContentStaff(user)) {
      return NextResponse.json({ error: "Unauthorized to edit question drafts" }, { status: 403 });
    }

    const body = await req.json();
    const updated = await QuestionDraftService.updateDraft(id, body, user);

    return NextResponse.json({
      success: true,
      message: "Question draft updated successfully.",
      draft: updated,
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Update question draft error:", err);
    return NextResponse.json({ error: err.message || "Failed to update draft" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    if (!user || !isAnyStaff(user)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const draft = await prisma.generatedQuestionDraft.findUnique({ where: { id } });
    if (!draft) {
      return NextResponse.json({ error: "Question draft not found" }, { status: 404 });
    }
    if (draft.status === DraftQuestionStatus.IMPORTED) {
      return NextResponse.json({ error: "Cannot delete an already imported question draft" }, { status: 400 });
    }

    await prisma.generatedQuestionDraft.delete({ where: { id } });

    return NextResponse.json({ success: true, message: "Draft deleted." });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Delete draft error:", err);
    return NextResponse.json({ error: err.message || "Failed to delete draft" }, { status: 500 });
  }
}
