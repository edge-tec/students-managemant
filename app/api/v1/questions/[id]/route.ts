import { NextRequest, NextResponse } from "next/server";
import { QuestionService } from "@/lib/questions/questionService";
import { getCurrentUser } from "@/lib/auth/session";
import { isContentStaff } from "@/lib/auth/rbac";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Question ID is required" }, { status: 400 });
    }

    const user = await getCurrentUser();
    const staff = isContentStaff(user);

    const question = await QuestionService.getQuestionById(id, user?.id, staff);
    if (!question) {
      return NextResponse.json({ error: "Question not found or unpublished" }, { status: 404 });
    }

    const similarQuestions = await QuestionService.getSimilarQuestions(id, 4);

    return NextResponse.json({
      question,
      similarQuestions,
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Get question by ID error:", err);
    return NextResponse.json({ error: err.message || "Failed to retrieve question" }, { status: 500 });
  }
}
