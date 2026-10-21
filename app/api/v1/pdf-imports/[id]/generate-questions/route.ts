import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { canGenerateAiQuestions } from "@/lib/auth/rbac";
import { QuestionDraftService } from "@/lib/pdf/questionDraftService";
import { QuestionGenerationConfig } from "@/lib/pdf/aiQuestionGenerator";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    if (!user || !canGenerateAiQuestions(user)) {
      return NextResponse.json({ error: "Unauthorized to generate questions" }, { status: 403 });
    }

    const body = (await req.json().catch(() => ({}))) as QuestionGenerationConfig;

    const result = await QuestionDraftService.startGeneration(id, body, user);

    return NextResponse.json({
      success: true,
      message: `Generated ${result.count} questions successfully.`,
      jobId: result.jobId,
      count: result.count,
      modelUsed: result.modelUsed,
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Generate questions API error:", err);
    return NextResponse.json({ error: err.message || "Failed to generate questions" }, { status: 500 });
  }
}
