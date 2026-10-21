import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { isContentStaff } from "@/lib/auth/rbac";
import { QuestionDraftService } from "@/lib/pdf/questionDraftService";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || !isContentStaff(user)) {
      return NextResponse.json({ error: "Unauthorized to import questions into Question Bank" }, { status: 403 });
    }

    const body = await req.json();
    const {
      draftIds,
      publishImmediately,
      category,
      classId,
      subjectId,
      chapterId,
      customSubjectName,
      customChapterName,
      topicName,
      isPremium,
    } = body;

    if (!Array.isArray(draftIds) || draftIds.length === 0) {
      return NextResponse.json({ error: "draftIds array is required" }, { status: 400 });
    }

    const result = await QuestionDraftService.importToQuestionBank(draftIds, user, {
      publishImmediately: Boolean(publishImmediately),
      category,
      classId,
      subjectId,
      chapterId,
      customSubjectName,
      customChapterName,
      topicName,
      isPremium: Boolean(isPremium),
    });

    return NextResponse.json({
      success: true,
      message: `Successfully imported ${result.importedCount} questions into the official Question Bank!`,
      importedCount: result.importedCount,
      questionIds: result.questionIds,
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Import to question bank error:", err);
    return NextResponse.json({ error: err.message || "Failed to import questions to question bank" }, { status: 400 });
  }
}
