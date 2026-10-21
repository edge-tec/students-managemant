import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { canAccessPdf } from "@/lib/auth/rbac";
import { QuestionDraftService } from "@/lib/pdf/questionDraftService";
import { DraftQuestionStatus, AiQuestionType, DifficultyLevel } from "@prisma/client";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    if (!user || !canAccessPdf(user)) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") as DraftQuestionStatus | undefined;
    const type = searchParams.get("type") as AiQuestionType | undefined;
    const difficulty = searchParams.get("difficulty") as DifficultyLevel | undefined;
    const search = searchParams.get("search") || undefined;
    const pageNum = searchParams.get("pageNumber") ? parseInt(searchParams.get("pageNumber")!, 10) : undefined;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);

    const result = await QuestionDraftService.listDrafts(id, {
      status,
      type,
      difficulty,
      sourcePage: pageNum,
      search,
      page,
      limit,
    });

    return NextResponse.json(result);
  } catch (error: unknown) {
    const err = error as Error;
    console.error("List generated questions error:", err);
    return NextResponse.json({ error: err.message || "Failed to list generated questions" }, { status: 500 });
  }
}
