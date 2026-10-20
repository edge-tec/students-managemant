import { NextRequest, NextResponse } from "next/server";
import { QuestionService } from "@/lib/questions/questionService";
import { getCurrentUser } from "@/lib/auth/session";
import { ReportReason } from "@prisma/client";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Question ID is required" }, { status: 400 });
    }

    const body = await req.json();
    const { reason, description } = body;

    if (!reason || !Object.values(ReportReason).includes(reason as ReportReason)) {
      return NextResponse.json(
        {
          error: `Invalid report reason. Must be one of: ${Object.values(ReportReason).join(", ")}`,
        },
        { status: 400 }
      );
    }

    const user = await getCurrentUser();

    const report = await QuestionService.reportQuestion(id, user?.id || null, {
      reason: reason as ReportReason,
      description: typeof description === "string" ? description.trim() : undefined,
    });

    return NextResponse.json({
      success: true,
      message: "Report submitted successfully. Thank you for helping keep our question bank accurate.",
      reportId: report.id,
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Report question error:", err);
    return NextResponse.json({ error: err.message || "Failed to submit question report" }, { status: 500 });
  }
}
