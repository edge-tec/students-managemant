import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { getCurrentUser } from "@/lib/auth/session";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const filterMastered = searchParams.get("mastered") === "true";

    const wrongQuestions = await prisma.wrongQuestion.findMany({
      where: {
        studentId: user.id,
        isMastered: filterMastered,
      },
      include: {
        question: {
          include: {
            options: { orderBy: { orderIndex: "asc" } },
            answer: true,
            subject: { select: { nameBn: true, nameEn: true } },
            chapter: { select: { nameBn: true, nameEn: true, chapterNum: true } },
          },
        },
      },
      orderBy: { lastMistake: "desc" },
    });

    return NextResponse.json({ wrongQuestions });
  } catch (error) {
    console.error("Wrong questions API error:", error);
    return NextResponse.json({ error: "Failed to fetch wrong questions" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { questionId, isMastered } = body;

    if (!questionId) {
      return NextResponse.json({ error: "Question ID required" }, { status: 400 });
    }

    const updated = await prisma.wrongQuestion.update({
      where: {
        studentId_questionId: {
          studentId: user.id,
          questionId,
        },
      },
      data: {
        isMastered: Boolean(isMastered),
        masteredAt: isMastered ? new Date() : null,
      },
    });

    return NextResponse.json({ success: true, updated });
  } catch (error) {
    console.error("Update wrong question error:", error);
    return NextResponse.json({ error: "Failed to update wrong question" }, { status: 400 });
  }
}
