import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { isContentStaff } from "@/lib/auth/rbac";
import { QuestionService } from "@/lib/questions/questionService";
import { ContentStatus } from "@prisma/client";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user || !isContentStaff(user)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { id } = await params;
    const question = await QuestionService.getQuestionById(id, user.id, true);

    if (!question) {
      return NextResponse.json({ error: "Question not found" }, { status: 404 });
    }

    return NextResponse.json({ question });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Admin get question error:", err);
    return NextResponse.json({ error: err.message || "Failed to retrieve question" }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user || !isContentStaff(user)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const { reason, ...data } = body;

    const updated = await QuestionService.updateQuestion(id, data, user.id, reason);

    return NextResponse.json({ success: true, question: updated });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Admin update question error:", err);
    return NextResponse.json({ error: err.message || "Failed to update question" }, { status: 400 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user || !isContentStaff(user)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const { status, comments } = body;

    if (!status || !Object.values(ContentStatus).includes(status as ContentStatus)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${Object.values(ContentStatus).join(", ")}` },
        { status: 400 }
      );
    }

    const updated = await QuestionService.updateStatus(id, status as ContentStatus, user.id, comments);

    return NextResponse.json({ success: true, question: updated });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Admin update question status error:", err);
    return NextResponse.json({ error: err.message || "Failed to change question status" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user || !isContentStaff(user)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { id } = await params;
    const archived = await QuestionService.updateStatus(
      id,
      ContentStatus.ARCHIVED,
      user.id,
      "Question archived by staff administrator"
    );

    return NextResponse.json({ success: true, message: "Question successfully archived", question: archived });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Admin archive question error:", err);
    return NextResponse.json({ error: err.message || "Failed to archive question" }, { status: 500 });
  }
}
