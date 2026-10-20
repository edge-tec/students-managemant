import { NextRequest, NextResponse } from "next/server";
import { QuestionService } from "@/lib/questions/questionService";
import { getCurrentUser } from "@/lib/auth/session";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Question ID is required" }, { status: 400 });
    }

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication required to bookmark questions" }, { status: 401 });
    }

    const result = await QuestionService.toggleBookmark(id, user.id);

    return NextResponse.json({
      success: true,
      bookmarked: result.bookmarked,
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Toggle bookmark error:", err);
    return NextResponse.json({ error: err.message || "Failed to update bookmark" }, { status: 500 });
  }
}
